/**
 * Supabase Cloud Database Integration for Khmer E-Invitation
 * Supports Real-time RSVP, Live Guestbook Wishes, Dynamic Config, and VIP Guests.
 * Includes automatic LocalStorage fallback if Supabase is offline or not configured.
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.loadCredentials();
  }

  loadCredentials() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_anon_key');

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url.trim(), key.trim());
        this.isConfigured = true;
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        this.isConfigured = false;
      }
    }
  }

  setCredentials(url, key) {
    if (url && key) {
      localStorage.setItem('supabase_url', url.trim());
      localStorage.setItem('supabase_anon_key', key.trim());
      this.loadCredentials();
      return true;
    }
    return false;
  }

  clearCredentials() {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    this.client = null;
    this.isConfigured = false;
  }

  async testConnection(url, key) {
    if (!window.supabase) {
      return { success: false, message: 'Supabase library not loaded' };
    }
    try {
      const tempClient = window.supabase.createClient(url.trim(), key.trim());
      const { data, error } = await tempClient.from('rsvps').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet, but authentication worked
        if (error.message.includes('relation "public.rsvps" does not exist')) {
          return { success: true, message: 'Connected to Supabase! (Please run the SQL schema to create tables)' };
        }
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Connected successfully to Supabase!' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // ==========================================================================
  // RSVP Operations
  // ==========================================================================
  async submitRsvp(rsvpData) {
    // 1. Always persist to LocalStorage first
    const localKey = 'khmer_wedding_rsvp_' + Date.now();
    localStorage.setItem(localKey, JSON.stringify(rsvpData));

    // 2. Persist to Server Database API (/api/rsvp)
    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvpData)
      });
      console.log('RSVP successfully saved to server database file!');
    } catch (e) {
      console.warn('Backend API save failed:', e);
    }

    // 3. Persist to Supabase Cloud if configured
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client.from('rsvps').insert([{
          name: rsvpData.name,
          phone: rsvpData.phone || '',
          attendance: rsvpData.attendance,
          count: parseInt(rsvpData.count || 0),
          wishes: rsvpData.wishes || '',
          submitted_at: rsvpData.submittedAt || new Date().toISOString()
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
          .order('submitted_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(r => ({
            name: r.name,
            phone: r.phone,
            attendance: r.attendance,
            count: r.count,
            wishes: r.wishes,
            submittedAt: r.submitted_at
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
        let query = this.client.from('rsvps').delete().eq('name', name);
        if (submittedAt) {
          query = query.eq('submitted_at', submittedAt);
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
        await this.client.from('rsvps').delete().neq('name', '___dummy_placeholder___');
      } catch (err) {
        console.warn('Failed to clear RSVPs from Supabase:', err);
      }
    }
  }

  // ==========================================================================
  // Wishes / Guestbook Operations
  // ==========================================================================
  async submitWish(wish) {
    try {
      await fetch('/api/wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wish)
      });
    } catch (e) {}

    if (this.isConfigured && this.client) {
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
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from('wishes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(w => ({
            name: w.name,
            date: w.date_display || 'ថ្មីៗនេះ',
            message: w.message
          }));
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
          return data.map(w => ({
            name: w.name,
            date: w.date_display || w.date || 'ថ្មីៗនេះ',
            message: w.message
          }));
        }
      }
    } catch (e) {}

    return null;
  }

  // ==========================================================================
  // Global Invitation Config
  // ==========================================================================
  async saveConfig(config) {
    // Save locally
    localStorage.setItem('khmer_invitation_config', JSON.stringify(config));

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
