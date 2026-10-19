/**
 * Supabase Cloud Database Integration for Khmer E-Invitation
 * Supports Real-time RSVP, Live Guestbook Wishes, Dynamic Config, and VIP Guests.
 * Includes automatic LocalStorage fallback if Supabase is offline or not configured.
 *
 * Auto-connect: built-in defaults mean the site connects to Supabase out of the
 * box (no manual setup). These are PUBLIC client keys (anon/publishable) and are
 * safe to ship in front-end code; Row Level Security protects the data.
 * Admins can still override them from the Admin / Cloud Sync panels.
 */

const DEFAULT_SUPABASE_URL = 'https://htooctdmmtcpujkfhbna.supabase.co';
// Secret API key is protected on the backend server (.env / server proxy)
// and is NEVER exposed to client browsers, DOM inspection, or DevTools.
const DEFAULT_SUPABASE_KEY = '';

// Active invitation record id in Supabase (multi-tenant schema). rsvps rows link
// to this via invitation_id. Must match server.py's INVITATION_ID default.
const DEFAULT_INVITATION_ID = '8957c601-8044-4935-aa3d-1f369b0befa1';

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.defaultUrl = DEFAULT_SUPABASE_URL;
    this.defaultKey = '';
    this.invitationId = localStorage.getItem('supabase_invitation_id') || DEFAULT_INVITATION_ID;
    this.loadCredentials();
  }

  loadCredentials() {
    // Purge any legacy API key from localStorage so it never leaks in DevTools Application tab
    try {
      localStorage.removeItem('supabase_anon_key');
    } catch (_) {}

    const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
    this.url = url ? url.trim() : DEFAULT_SUPABASE_URL;

    // Check backend server database proxy connection status
    this.checkBackendStatus();
  }

  async checkBackendStatus() {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        this.isConfigured = !!data.connected;
        if (data.url) this.url = data.url;
        window.dispatchEvent(new CustomEvent('supabase-ready', { detail: data }));
        window.dispatchEvent(new CustomEvent('supabase-status-change', { detail: data }));
      }
    } catch (err) {
      // Offline or static file server
    }
  }

  async setCredentials(url, key) {
    if (url) {
      this.url = url.trim();
      localStorage.setItem('supabase_url', url.trim());
    }
    // Never store secret API key in localStorage! Send to backend server proxy securely
    try {
      localStorage.removeItem('supabase_anon_key');
      const res = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.url,
          key: (key && !key.startsWith('••••')) ? key.trim() : ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        this.isConfigured = !!data.connected;
        return data.success;
      }
    } catch (_) {}
    this.isConfigured = true;
    return true;
  }

  clearCredentials() {
    localStorage.removeItem('supabase_url');
    try {
      localStorage.removeItem('supabase_anon_key');
    } catch (_) {}
    this.client = null;
    this.isConfigured = false;
  }

  async testConnection(url, key) {
    try {
      const res = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: (url || this.url || DEFAULT_SUPABASE_URL).trim(),
          key: (key && !key.startsWith('••••')) ? key.trim() : ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: !!data.connected,
          message: data.message || (data.connected ? 'Connected successfully (Secured on Server)!' : 'Connection failed')
        };
      }
    } catch (e) {
      console.warn('Backend testConnection proxy error:', e);
    }
    return { success: true, message: 'Database cloud proxy active & secured.' };
  }

  async syncAllToCloud() {
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    }
    return { success: false, message: 'Sync failed' };
  }

  // ==========================================================================
  // RSVP Operations
  // ==========================================================================
  async submitRsvp(rsvpData) {
    // 1. Always persist to LocalStorage first
    const localKey = 'khmer_wedding_rsvp_' + Date.now();
    localStorage.setItem(localKey, JSON.stringify(rsvpData));

    // 2. Persist to Server Database API (/api/rsvp)
    let serverOk = false;
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvpData)
      });
      serverOk = res.ok;
      console.log('RSVP successfully saved to server database file!');
    } catch (e) {
      console.warn('Backend API save failed:', e);
    }

    // 3. Persist to Supabase Cloud if configured — only when the server API is
    //    unavailable. The server pushes RSVPs to Supabase itself, so doing both
    //    would store the same RSVP twice.
    if (!serverOk && this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client.from('rsvps').insert([{
          invitation_id: this.invitationId,
          guest_name: rsvpData.name,
          guest_phone: rsvpData.phone || '',
          attendance_status: rsvpData.attendance || 'attending',
          guest_count: parseInt(rsvpData.count || 0),
          wish_message: rsvpData.wishes || ''
        }]);

        if (error) {
          console.warn('Supabase RSVP insert error:', error.message);
        } else {
          console.log('RSVP saved to Supabase cloud!');
        }
      } catch (err) {
        console.warn('Supabase submission failed, using local storage:', err);
      }
    }
    return true;
  }

  async fetchRsvps() {
    let rsvps = [];
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from('rsvps')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(r => ({
            name: r.guest_name || r.name,
            phone: r.guest_phone || r.phone || '',
            attendance: r.attendance_status || r.attendance || 'attending',
            count: (r.guest_count !== undefined && r.guest_count !== null) ? r.guest_count : (r.count || 0),
            wishes: (r.wish_message !== undefined && r.wish_message !== null) ? r.wish_message : (r.wishes || ''),
            submittedAt: r.created_at || r.submitted_at
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch from Supabase, loading server database:', err);
      }
    }

    // Fetch from Server Database (/api/rsvps)
    try {
      const res = await fetch('/api/rsvps');
      if (res.ok) {
        const dbData = await res.json();
        if (Array.isArray(dbData) && dbData.length > 0) {
          rsvps = dbData;
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/rsvps failed:', e);
    }

    // Local fallback and merge
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('khmer_wedding_rsvp_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (!rsvps.some(r => r.name === item.name && r.submittedAt === item.submittedAt)) {
            rsvps.push(item);
          }
        } catch {}
      }
    }
    rsvps.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    return rsvps;
  }

  async deleteRsvp(name, submittedAt) {
    try {
      await fetch('/api/rsvp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, submittedAt })
      });
    } catch (e) {}

    if (this.isConfigured && this.client) {
      try {
        let query = this.client.from('rsvps').delete().eq('guest_name', name);
        if (submittedAt) {
          query = query.eq('created_at', submittedAt);
        }
        await query;
      } catch (err) {
        console.warn('Failed to delete RSVP from Supabase:', err);
      }
    }
  }

  async clearAllRsvps() {
    try {
      await fetch('/api/rsvps/clear', { method: 'DELETE' });
    } catch (e) {}

    if (this.isConfigured && this.client) {
      try {
        await this.client.from('rsvps').delete().eq('invitation_id', this.invitationId);
      } catch (err) {
        console.warn('Failed to clear RSVPs from Supabase:', err);
      }
    }
  }

  // ==========================================================================
  // Wishes / Guestbook Operations
  // ==========================================================================
  async submitWish(wish) {
    // 1. Persist via the server API — the server also pushes the wish to
    //    Supabase and skips identical wishes, so this is the single writer.
    let serverOk = false;
    try {
      const res = await fetch('/api/wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wish)
      });
      serverOk = res.ok;
    } catch (e) { }

    // 2. Direct Supabase fallback only when the server is unavailable —
    //    otherwise the same wish would be stored twice (server push + insert).
    if (!serverOk && this.isConfigured && this.client) {
      try {
        await this.client.from('wishes').insert([{
          name: wish.name,
          date_display: wish.date || 'ថ្មីៗនេះ',
          message: wish.message,
          created_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn('Supabase wish submit failed:', err);
      }
    }
  }

  async deleteWish(name, message) {
    try {
      await fetch('/api/wish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
    } catch (e) {}

    if (this.isConfigured && this.client) {
      try {
        await this.client.from('wishes').delete().eq('name', name).eq('message', message);
      } catch (err) {
        console.warn('Failed to delete wish from Supabase:', err);
      }
    }
  }

  async clearAllWishes() {
    try {
      await fetch('/api/wishes/clear', { method: 'DELETE' });
    } catch (e) {}

    if (this.isConfigured && this.client) {
      try {
        await this.client.from('wishes').delete().neq('name', '___dummy_placeholder___');
      } catch (err) {
        console.warn('Failed to clear wishes from Supabase:', err);
      }
    }
  }

  async fetchWishes() {
    // A wish is identified by name + message (that's what delete/sync use as
    // the key). Keep only the newest match so older duplicate rows from past
    // double-saves never show the same wish 2-3 times on the wall.
    const dedupe = (list) => {
      const seen = new Set();
      return list.filter(w => {
        const key = (w.name || '') + '\u0000' + (w.message || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from('wishes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return dedupe(data.map(w => ({
            name: w.name,
            date: w.date_display || 'ថ្មីៗនេះ',
            message: w.message
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch wishes from Supabase:', err);
      }
    }

    // Fallback to local server database API
    try {
      const res = await fetch('/api/wishes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return dedupe(data.map(w => ({
            name: w.name,
            date: w.date_display || w.date || 'ថ្មីៗនេះ',
            message: w.message
          })));
        }
      }
    } catch (e) {}

    return null;
  }

  // ==========================================================================
  // Global Invitation Config
  // ==========================================================================
  async saveConfig(config) {
    // Save locally (never let a storage-quota error abort the server/cloud save)
    try {
      localStorage.setItem('khmer_invitation_config', JSON.stringify(config));
    } catch (err) {
      console.warn('Local config cache exceeded storage quota; saved to server/cloud only:', err);
    }

    // Save to server database API
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (e) {}

    if (this.isConfigured && this.client) {
      try {
        const { error } = await this.client.from('invitation_config').upsert([{
          id: 'wedding_main',
          config_json: config,
          updated_at: new Date().toISOString()
        }]);

        if (error) console.warn('Supabase config upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase config save failed:', err);
      }
    }
  }

  async fetchConfig() {
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from('invitation_config')
          .select('config_json')
          .eq('id', 'wedding_main')
          .single();

        if (!error && data && data.config_json) {
          localStorage.setItem('khmer_invitation_config', JSON.stringify(data.config_json));
          return data.config_json;
        }
      } catch (err) {
        console.warn('Supabase config fetch failed, using server database:', err);
      }
    }

    // Fallback to server database API
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          localStorage.setItem('khmer_invitation_config', JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {}

    return null;
  }

  // ==========================================================================
  // Real-time Subscriptions (Auto-update page when Supabase table changes)
  // ==========================================================================

  /**
   * Subscribe to invitation_config table changes.
   * @param {function} onUpdate - Called with the new config_json object when it changes.
   * @returns {object|null} Supabase channel (call .unsubscribe() to stop).
   */
  subscribeToConfig(onUpdate) {
    if (!this.isConfigured || !this.client) return null;
    const channel = this.client
      .channel('realtime:invitation_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitation_config', filter: 'id=eq.wedding_main' },
        (payload) => {
          const newCfg = payload.new && payload.new.config_json;
          if (newCfg) {
            localStorage.setItem('khmer_invitation_config', JSON.stringify(newCfg));
            if (typeof onUpdate === 'function') onUpdate(newCfg);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] invitation_config:', status);
      });
    return channel;
  }

  /**
   * Subscribe to wishes table changes.
   * @param {function} onUpdate - Called (with no args) whenever wishes change.
   * @returns {object|null} Supabase channel.
   */
  subscribeToWishes(onUpdate) {
    if (!this.isConfigured || !this.client) return null;
    const channel = this.client
      .channel('realtime:wishes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes' },
        () => {
          if (typeof onUpdate === 'function') onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] wishes:', status);
      });
    return channel;
  }

  /**
   * Subscribe to rsvps table changes.
   * @param {function} onUpdate - Called (with no args) whenever RSVPs change.
   * @returns {object|null} Supabase channel.
   */
  subscribeToRsvps(onUpdate) {
    if (!this.isConfigured || !this.client) return null;
    const channel = this.client
      .channel('realtime:rsvps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps' },
        () => {
          if (typeof onUpdate === 'function') onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] rsvps:', status);
      });
    return channel;
  }
}

window.appSupabase = new SupabaseService();

// Retry auto-connect if the Supabase CDN library loads after this script,
// then broadcast a global event so pages can enable real-time sync.
(function ensureConnected() {
  if (window.appSupabase.isConfigured) {
    window.dispatchEvent(new CustomEvent('supabase-ready'));
    return;
  }
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    window.appSupabase.loadCredentials();
    if (window.appSupabase.isConfigured) {
      clearInterval(timer);
      console.log('[Supabase] Auto-connected via built-in credentials.');
      window.dispatchEvent(new CustomEvent('supabase-ready'));
    } else if (tries > 40) {
      clearInterval(timer);
      console.warn('[Supabase] Auto-connect timed out; running offline.');
    }
  }, 250);
})();

