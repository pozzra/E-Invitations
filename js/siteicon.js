/* ==========================================================================
   Site Icon (favicon) - shared helper
   --------------------------------------------------------------------------
   Applies the admin-configured site icon (Design Settings -> App Icon /
   Favicon) to every page that includes this script: the admin panel, the
   user account page, and any other page that wants the custom icon.

   Usage (place after js/supabase.js when the page loads it):
     <script src="../js/siteicon.js?v=20261019icon"></script>

   Source of truth: config.faviconUrl, or config.faviconList + faviconIndex.
   Falls back to the default golden seal when no custom icon is set.
   ========================================================================== */
(function () {
  'use strict';

  // Resolve the site root from this script's own URL. This file lives in
  // "<root>/js/", so the site root is one level up. Stored paths like
  // "assets/images/x.jpg" then work at the server root and under a sub-path.
  var ROOT = '/';
  try {
    var self = document.querySelector('script[src*="siteicon.js"]');
    if (self && self.src) ROOT = new URL('../', self.src).href;
  } catch (e) { }
  var DEFAULT_ICON = ROOT + 'assets/images/golden_seal.jpg';

  function resolve(url) {
    url = String(url || '').trim();
    if (!url) return '';
    if (/^(https?:|data:|blob:|\/\/|\/)/i.test(url)) return url;
    return ROOT + url.replace(/^\.?\//, '');
  }

  function pickFromConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return '';
    var url = cfg.faviconUrl ? String(cfg.faviconUrl).trim() : '';
    if (!url && Array.isArray(cfg.faviconList) && cfg.faviconList.length) {
      var idx = parseInt(cfg.faviconIndex, 10) || 0;
      idx = Math.min(Math.max(0, idx), cfg.faviconList.length - 1);
      var entry = cfg.faviconList[idx];
      url = entry && (entry.src || typeof entry === 'string') ? String(entry.src || entry).trim() : '';
    }
    return url;
  }

  function ensureLink(id, rel) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('link');
      el.id = id;
      el.rel = rel;
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  function typeFor(url) {
    var ext = (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
    return ext === 'ico' ? 'image/x-icon'
      : ext === 'png' ? 'image/png'
        : ext === 'svg' ? 'image/svg+xml'
          : ext === 'webp' ? 'image/webp'
            : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : '';
  }

  // Apply an icon URL as stored in the config ('assets/...' or absolute).
  // Empty string = use the default golden seal.
  function set(url) {
    var href = resolve(url) || DEFAULT_ICON;
    var fav = ensureLink('app-favicon', 'icon');
    fav.setAttribute('href', href);
    var type = typeFor(href);
    if (type) fav.setAttribute('type', type);
    else fav.removeAttribute('type');
    ensureLink('app-apple-icon', 'apple-touch-icon').setAttribute('href', href);
  }

  function fromCache() {
    try {
      return JSON.parse(localStorage.getItem('khmer_invitation_config') || 'null');
    } catch (e) { return null; }
  }

  // 1) Instant apply from the cached config (no icon flash on reloads)
  set(pickFromConfig(fromCache()));

  // 2) Refresh from the live source once every other script has run
  function refresh() {
    var applied = false;
    function apply(cfg) {
      if (applied || !cfg || typeof cfg !== 'object') return;
      applied = true;
      set(pickFromConfig(cfg));
    }
    try {
      if (window.appSupabase && typeof window.appSupabase.fetchConfig === 'function') {
        // fetchConfig already falls back to /api/config when Supabase is offline
        window.appSupabase.fetchConfig().then(apply).catch(function () { });
        return;
      }
      fetch(ROOT + 'api/config', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(apply)
        .catch(function () { });
    } catch (e) { }
  }
  if (document.readyState === 'complete') setTimeout(refresh, 0);
  else window.addEventListener('load', function () { setTimeout(refresh, 0); });

  // Public API - pages may call SiteIcon.set(url) or SiteIcon.applyFromConfig(cfg)
  window.SiteIcon = {
    set: set,
    applyFromConfig: function (cfg) { set(pickFromConfig(cfg)); },
    pickFromConfig: pickFromConfig,
    resolve: resolve,
    root: ROOT
  };
})();
