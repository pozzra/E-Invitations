/**
 * Khmer E-Invitation Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. URL Query Parameter Personalized Guest Greeting
  const urlParams = new URLSearchParams(window.location.search);
  const guestParam = urlParams.get('to') || urlParams.get('guest') || urlParams.get('name');

  const envelopeGuestEl = document.getElementById('envelope-guest-name');
  const heroGuestEl = document.getElementById('hero-guest-name');
  const guestNameInput = document.getElementById('guest-name-input');

  if (guestParam) {
    const formattedGuest = decodeURIComponent(guestParam.replace(/\+/g, ' '));
    if (envelopeGuestEl) envelopeGuestEl.textContent = formattedGuest;
    if (heroGuestEl) heroGuestEl.textContent = formattedGuest;
    if (guestNameInput) guestNameInput.value = formattedGuest;
  }

  // 2. Interactive Envelope Opening & Music Autoplay Trigger
  const envelopeScreen = document.getElementById('envelope-screen');
  const envelopeTrigger = document.getElementById('envelope-trigger');
  const envelopeCard = document.querySelector('.envelope-card');
  const sealWrapper = document.querySelector('.envelope-seal-wrapper');
  const invitationBody = document.querySelector('.invitation-body');
  const btnMusic = document.getElementById('btn-toggle-music');

  let hasOpened = false;

  function openEnvelope() {
    if (hasOpened) return;
    hasOpened = true;

    // Trigger golden chime sound
    if (window.traditionalAudio) {
      window.traditionalAudio.playSealBreakSound();
      setTimeout(() => {
        window.traditionalAudio.startBackgroundMusic();
        if (btnMusic) btnMusic.classList.add('spinning');
      }, 500);
    }

    // Trigger 3D animation stages
    if (sealWrapper) sealWrapper.classList.add('break-seal');
    if (envelopeCard) envelopeCard.classList.add('is-unfolding');

    // Confetti celebration cannon + particle burst
    createParticleBurst();
    fireCelebrationConfetti(window.innerWidth / 2, window.innerHeight / 2, 75);

    setTimeout(() => {
      envelopeScreen.classList.add('opened');
      if (invitationBody) invitationBody.classList.add('entry-card-float');
    }, 450);

    setTimeout(() => {
      envelopeScreen.style.display = 'none';
      // Trigger initial scroll reveal check
      triggerScrollReveal();
    }, 1100);
  }

  if (envelopeTrigger) {
    envelopeTrigger.addEventListener('click', openEnvelope);
  }

  // Music Button Toggle
  if (btnMusic) {
    btnMusic.addEventListener('click', () => {
      if (window.traditionalAudio) {
        const isPlaying = window.traditionalAudio.toggleMusic();
        if (isPlaying) {
          btnMusic.classList.add('spinning');
          showToast('🎶 កំពុងចាក់តន្ត្រីមង្គលការ');
        } else {
          btnMusic.classList.remove('spinning');
          showToast('🔇 បានបិទតន្ត្រី');
        }
      }
    });
  }

  // ==========================================================================
  // Dynamic Configuration Loader (Admin Customizable)
  // ==========================================================================
  const defaultConfig = {
    groomName: 'ជា វិបុល',
    brideName: 'ស៊ុន ទេវី',
    groomFather: 'ជា សុខា',
    groomMother: 'ឃឹម សុភាព',
    brideFather: 'ស៊ុន វណ្ណា',
    brideMother: 'អ៊ុច ចរិយា',
    solarDate: 'ថ្ងៃអាទិត្យ ទី១៥ ខែវិច្ឆិកា ឆ្នាំ២០២៦',
    lunarDate: 'ត្រូវនឹងថ្ងៃ ៥កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៧០',
    targetDateTime: '2026-11-15T07:00:00+07:00',
    venueName: 'មជ្ឈមណ្ឌលសន្និបាត និងពិព័រណ៍កោះពេជ្រ (អគារ G)',
    venueAddress: '📍 ទីតាំង៖ កោះពេជ្រ សង្កាត់ទន្លេបាសាក់ ខណ្ឌចំការមន រាជធានីភ្នំពេញ\n(Koh Pich Exhibition Center, Building G, Phnom Penh)',
    mapsUrl: 'https://maps.google.com/?q=Koh+Pich+Convention+and+Exhibition+Center+Building+G+Phnom+Penh',
    bankAccName: 'CHEA VIBOL & SUN DEVI',
    bankAccNum: '001 888 999 (USD)',
    bankName: 'ABA Bank / Bakong',
    qrImage: '',
    couplePhoto: 'assets/images/couple.jpg',
    blessingVerse: '☸ ជយោ ហោតុ សព្វទា ☸',
    invitationTitle: 'សិរីសួស្តី អាពាហ៍ពិពាហ៍',
    invitationHeader: 'លិខិតអញ្ជើញ',
    envelopeBadge: 'E-INVITATION • លិខិតអញ្ជើញ',
    envelopeHint: '✨ ចុចត្រាមាសដើម្បីបើកសំបុត្រ ✨',
    invitationGreeting: 'យើងខ្ញុំសូមគោរពអញ្ជើញ',
    invitationSubtext: 'ចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីមង្គលការកូនប្រុស-កូនស្រីរបស់យើងខ្ញុំ',
    sealImage: 'assets/images/golden_seal.jpg',
    faviconUrl: '',
    faviconList: [],
    faviconIndex: 0,
    bgMusicUrl: 'assets/audio/bg_music.mp3',
    bgMusicPlaylist: [
      { type: 'file', src: 'assets/audio/bg_music.mp3', title: 'Default Background Music' }
    ],
    sections: {
      countdown: true,
      parents: true,
      video: true,
      schedule: true,
      venue: true,
      gift: true,
      rsvp: true,
      guestbook: true
    },
    theme: {
      mode: 'auto',
      accent: '',
      bg: ''
    },
    language: 'auto',
    fonts: {
      khmer: '',
      khmerHeading: '',
      english: '',
      customUrl: '',
      customFamily: ''
    },
    thankYouText: 'សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមានដ៏ឧត្តុង្គឧត្តមរបស់លោកអ្នក',
    footerCredit: 'Designed with Khmer Traditional Heritage & Modern Elegance',
    // Editable section headings, subtitles & button labels (see [data-cfg-text]).
    texts: {
      envelopeBadge: 'E-INVITATION • លិខិតអញ្ជើញ',
      envelopeGuestLabel: 'សូមគោរពអញ្ជើញ៖',
      countdownTitle: 'រាប់ថយក្រោយដល់ថ្ងៃសិរីមង្គល',
      countdownSubtitle: 'Countdown to Auspicious Day',
      addToCalendarBtn: 'កត់ត្រាក្នុងប្រតិទិន (Add to Calendar)',
      parentsTitle: 'មាតាបិតាទាំងសងខាង',
      parentsSubtitle: 'The Honorable Parents',
      scheduleTitle: 'កាលវិភាគកម្មវិធីសិរីមង្គល',
      scheduleSubtitle: 'Wedding Ceremony Schedule',
      venueTitle: 'ទីតាំងប្រារព្ធពិធី',
      venueSubtitle: 'Ceremony & Banquet Venue',
      mapsBtn: 'បើកមើលផែនទី (Google Maps)',
      giftTitle: 'ចំណងដៃអាពាហ៍ពិពាហ៍ឌីជីថល',
      giftSubtitle: 'Wedding Gift & Blessings',
      giftQrBtn: 'ស្កេន QR Code ចងដៃ (Digital Blessing)',
      rsvpTitle: 'ការបញ្ជាក់ការចូលរួម (RSVP)',
      rsvpSubtitle: 'Please Confirm Your Attendance',
      rsvpSubmitBtn: 'ផ្ញើការបញ្ជាក់ (Submit RSVP)',
      wishesTitle: 'សៀវភៅជូនពរឌីជីថល',
      wishesSubtitle: 'Guestbook & Warm Wishes',
      vipTitle: 'បង្កើតតំណភ្ជាប់អញ្ជើញផ្ទាល់ខ្លួន',
      vipSubtitle: 'Generate Personalized VIP Link',
      khqrTitle: 'ចំណងដៃអាពាហ៍ពិពាហ៍',
      khqrSubtitle: 'Scan KHQR to Send Blessing'
    },
    videoAlbum: {
      enabled: true,
      title: 'វីដេអូអនុស្សាវរីយ៍ & សាច់រឿងស្នេហា',
      subtitle: 'Cinematic Wedding Video & Love Story',
      desc: 'សូមទស្សនាវីដេអូអនុស្សាវរីយ៍ដ៏មានអត្ថន័យ និងសាច់រឿងនៃក្តីស្រឡាញ់របស់គូស្វាមីភរិយាថ្មី',
      videoUrl: '',
      posterUrl: 'assets/images/couple.jpg',
      tag: 'Wedding Highlights & Story'
    },
    schedule: [
      { time: '07:00 AM', title: 'ពិធីហែជំនូន និងសែនព្រេន', desc: "Groom's Procession & Ancestor Blessing Ceremony" },
      { time: '09:30 AM', title: 'ពិធីកាត់សក់បង្កក់សិរី', desc: 'Traditional Hair Cutting & Purification Ceremony' },
      { time: '02:00 PM', title: 'ពិធីសំពះផ្ទឹម និងបង្វិលពពិល', desc: 'Sacred Knot Tying & Popil Twirling Blessing' },
      { time: '05:30 PM', title: 'ពិធីទទួលទានភោជនាហារ និងរាំកម្សាន្ត', desc: 'Grand Evening Wedding Banquet & Celebration' }
    ],
    bankAppLink: ''
  };

  // ---- Appearance: theme mode, accent/bg colors, language, fonts ----
  function _hexToRgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    if (isNaN(n)) return { r: 229, g: 185, b: 85 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function _mix(hex, target, amt) {
    const a = _hexToRgb(hex), b = _hexToRgb(target);
    return 'rgb(' + Math.round(a.r + (b.r - a.r) * amt) + ', ' +
      Math.round(a.g + (b.g - a.g) * amt) + ', ' +
      Math.round(a.b + (b.b - a.b) * amt) + ')';
  }
  function _rgba(hex, alpha) {
    const c = _hexToRgb(hex);
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
  }
  function _setVar(name, value) {
    if (value) document.documentElement.style.setProperty(name, value);
    else document.documentElement.style.removeProperty(name);
  }
  function _loadFontLink(id, url) {
    let link = document.getElementById(id);
    if (!url) { if (link) link.remove(); return; }
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== url) link.setAttribute('href', url);
  }
  function applyAppearance(config) {
    const theme = config.theme || {};
    const fonts = config.fonts || {};
    const root = document.documentElement;

    // 1) Theme mode (auto follows the OS preference)
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const mode = (theme.mode === 'dark' || theme.mode === 'light') ? theme.mode : (prefersLight ? 'light' : 'dark');
    root.setAttribute('data-theme', mode);

    // 2) Accent (gold) color
    if (theme.accent) {
      const a = theme.accent;
      _setVar('--primary-gold', a);
      _setVar('--primary-gold-light', _mix(a, '#ffffff', 0.4));
      _setVar('--primary-gold-dark', _mix(a, '#000000', 0.3));
      _setVar('--gold-gradient', 'linear-gradient(135deg, ' + _mix(a, '#ffffff', 0.5) + ' 0%, ' + a + ' 50%, ' + _mix(a, '#000000', 0.28) + ' 100%)');
      _setVar('--gold-glow', '0 0 25px ' + _rgba(a, 0.45));
      _setVar('--text-gold', _mix(a, '#ffffff', 0.3));
    } else {
      ['--primary-gold', '--primary-gold-light', '--primary-gold-dark', '--gold-gradient', '--gold-glow', '--text-gold'].forEach(v => _setVar(v, ''));
    }

    // 3) Background color (base gradient + glass surfaces)
    if (theme.bg) {
      const b = theme.bg;
      const toLight = mode === 'light';
      _setVar('--bg-deep-navy', b);
      _setVar('--bg-burgundy', _mix(b, toLight ? '#000000' : '#ffffff', 0.05));
      _setVar('--bg-grad-1', b);
      _setVar('--bg-grad-2', _mix(b, toLight ? '#000000' : '#ffffff', 0.06));
      _setVar('--bg-grad-3', _mix(b, toLight ? '#000000' : '#ffffff', 0.12));
      _setVar('--bg-overlay', _rgba(b, 0.9));
      _setVar('--glass-bg', _rgba(_mix(b, '#ffffff', 0.06), 0.65));
    } else {
      ['--bg-deep-navy', '--bg-burgundy', '--bg-grad-1', '--bg-grad-2', '--bg-grad-3', '--bg-overlay', '--glass-bg'].forEach(v => _setVar(v, ''));
    }

    // 4) Language (sets <html lang> + data-lang; affects font priority)
    let langTag = 'km', langCode = 'kh';
    if (config.language === 'en') { langTag = 'en'; langCode = 'en'; }
    else if (config.language === 'kh') { langTag = 'km'; langCode = 'kh'; }
    else {
      const sys = (navigator.language || 'km').toLowerCase();
      langTag = sys;
      langCode = sys.indexOf('km') === 0 ? 'kh' : 'en';
    }
    root.setAttribute('lang', langTag);
    root.setAttribute('data-lang', langCode);

    // 5) Fonts
    const fams = [fonts.khmer, fonts.khmerHeading, fonts.english].filter(Boolean);
    if (fams.length) {
      const q = [...new Set(fams)].map(f => 'family=' + String(f).replace(/\s+/g, '+')).join('&');
      _loadFontLink('app-dyn-fonts', 'https://fonts.googleapis.com/css2?' + q + '&display=swap');
    } else {
      _loadFontLink('app-dyn-fonts', '');
    }
    _loadFontLink('app-custom-font', fonts.customUrl || '');

    if (fonts.customFamily) {
      ['--font-khmer-body', '--font-khmer-sub', '--font-khmer-heading', '--font-khmer-serif'].forEach(v => _setVar(v, fonts.customFamily));
    } else {
      const khmer = fonts.khmer, english = fonts.english, heading = fonts.khmerHeading;
      if (khmer || english) {
        const stack = [khmer ? "'" + khmer + "'" : null, english ? "'" + english + "'" : null, 'sans-serif'].filter(Boolean).join(', ');
        _setVar('--font-khmer-body', stack);
        _setVar('--font-khmer-sub', stack);
        const serif = [khmer ? "'" + khmer + "'" : null, english ? "'" + english + "'" : null, 'serif'].filter(Boolean).join(', ');
        _setVar('--font-khmer-serif', serif);
      } else {
        ['--font-khmer-body', '--font-khmer-sub', '--font-khmer-serif'].forEach(v => _setVar(v, ''));
      }
      if (heading || english) {
        const head = ["'" + (heading || 'Moul') + "'", khmer ? "'" + khmer + "'" : null, english ? "'" + english + "'" : null, 'serif'].filter(Boolean).join(', ');
        _setVar('--font-khmer-heading', head);
      } else {
        _setVar('--font-khmer-heading', '');
      }
    }

    // Site Icon / Favicon (admin-customizable via Configurations)
    let favUrl = config && config.faviconUrl ? String(config.faviconUrl).trim() : '';
    if (!favUrl && config && Array.isArray(config.faviconList) && config.faviconList.length) {
      const idx = Math.min(Math.max(0, parseInt(config.faviconIndex, 10) || 0), config.faviconList.length - 1);
      const entry = config.faviconList[idx];
      favUrl = entry && (entry.src || typeof entry === 'string') ? String(entry.src || entry).trim() : '';
    }
    const favEl = document.getElementById('app-favicon');
    const appleEl = document.getElementById('app-apple-icon');
    if (favEl) {
      if (favUrl) {
        favEl.setAttribute('href', favUrl);
        const ext = (favUrl.split('?')[0].split('.').pop() || '').toLowerCase();
        const type = ext === 'ico' ? 'image/x-icon'
          : ext === 'png' ? 'image/png'
            : ext === 'svg' ? 'image/svg+xml'
              : ext === 'webp' ? 'image/webp'
                : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : '';
        if (type) favEl.setAttribute('type', type);
        else favEl.removeAttribute('type');
      } else {
        favEl.setAttribute('href', 'assets/images/golden_seal.jpg');
        favEl.removeAttribute('type');
      }
    }
    if (appleEl) appleEl.setAttribute('href', favUrl || 'assets/images/golden_seal.jpg');

    // Re-apply when the OS switches light/dark while in auto mode
    if (!window.__themeAutoWired && window.matchMedia) {
      window.__themeAutoWired = true;
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const handler = () => {
        const m = (currentConfig && currentConfig.theme && currentConfig.theme.mode) || 'auto';
        if (m === 'auto') applyAppearance(currentConfig);
      };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  function getInvitationConfig() {
    try {
      const stored = localStorage.getItem('khmer_invitation_config');
      return stored ? Object.assign({}, defaultConfig, JSON.parse(stored)) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  }

  // currentConfig is mutable so countdown & copy-acc always see latest data
  let currentConfig = getInvitationConfig();

  // ── Video Poster Gallery Slideshow (brand-new animations: book-open + water-drop) ──
  function stopPosterGalleryTimer() {
    if (window.__posterGalleryTimer) {
      clearInterval(window.__posterGalleryTimer);
      window.__posterGalleryTimer = null;
    }
  }

  function hidePosterGallery() {
    const el = document.getElementById('video-poster-gallery');
    if (el) el.classList.add('poster-gallery-hidden');
  }

  function showPosterGallery() {
    const el = document.getElementById('video-poster-gallery');
    if (el && (window.__posterGalleryList || []).length >= 2) {
      el.classList.remove('poster-gallery-hidden');
    }
  }

  function paintPosterSlide(index) {
    const stage = document.getElementById('poster-gallery-stage');
    const drops = document.getElementById('poster-gallery-drops');
    const list = window.__posterGalleryList || [];
    if (!stage || !list.length) return;

    const n = list.length;
    index = ((index % n) + n) % n;
    window.__posterGalleryIndex = index;

    const slide = document.createElement('div');
    slide.className = 'poster-slide ' + (index % 2 === 0 ? 'anim-book-open' : 'anim-water-drop');
    slide.style.backgroundImage = 'url("' + String(list[index]).replace(/["\\]/g, '') + '")';
    stage.appendChild(slide);

    // Retire older slides so only the newest animates in.
    Array.prototype.forEach.call(stage.querySelectorAll('.poster-slide'), (s) => {
      if (s !== slide) {
        s.classList.remove('anim-book-open', 'anim-water-drop');
        s.classList.add('poster-slide-out');
        setTimeout(() => s.remove(), 950);
      }
    });
    while (stage.children.length > 3) stage.removeChild(stage.firstChild);

    // Book-spine sweep on book-open steps.
    const book = document.getElementById('poster-gallery-book');
    if (book && index % 2 === 0) {
      book.classList.remove('book-sweep');
      void book.offsetWidth;
      book.classList.add('book-sweep');
    }

    // Water-droplet index dots.
    if (drops) {
      Array.prototype.forEach.call(drops.querySelectorAll('.poster-drop-dot'), (d, i) => {
        d.classList.toggle('active', i === index);
      });
    }
  }

  function buildPosterDrops(count) {
    const drops = document.getElementById('poster-gallery-drops');
    if (!drops) return;
    drops.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'poster-drop-dot';
      dot.setAttribute('aria-label', 'Poster ' + (i + 1));
      dot.style.animationDelay = (i * 90) + 'ms';
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        paintPosterSlide(i);
        startPosterGalleryTimer();
      });
      drops.appendChild(dot);
    }
  }

  function startPosterGalleryTimer() {
    stopPosterGalleryTimer();
    if ((window.__posterGalleryList || []).length < 2) return;
    window.__posterGalleryTimer = setInterval(() => {
      paintPosterSlide((window.__posterGalleryIndex || 0) + 1);
    }, 3800);
  }

  function setupPosterGallery(list) {
    const el = document.getElementById('video-poster-gallery');
    const stage = document.getElementById('poster-gallery-stage');
    if (!el || !stage) return;

    const clean = (Array.isArray(list) ? list : [])
      .map(u => String(u || '').trim())
      .filter(Boolean);
    window.__posterGalleryList = clean;
    window.__posterGalleryIndex = 0;

    if (clean.length < 2) {
      el.classList.add('poster-gallery-hidden');
      el.setAttribute('aria-hidden', 'true');
      stage.innerHTML = '';
      stopPosterGalleryTimer();
      return;
    }

    el.setAttribute('aria-hidden', 'false');
    stage.innerHTML = '';
    buildPosterDrops(clean.length);
    paintPosterSlide(0);
    el.classList.remove('poster-gallery-hidden');
    startPosterGalleryTimer();
  }

  function applyInvitationConfig(config) {
    // Appearance first (theme mode, colors, language, fonts)
    applyAppearance(config);

    // Envelope, Blessings & Hero Texts
    const envBadge = document.getElementById('display-envelope-badge');
    const envTitle = document.getElementById('display-envelope-title');
    const envHint = document.getElementById('display-envelope-hint');
    const sealImg = document.getElementById('seal-img');
    const sacredVerse = document.getElementById('display-sacred-verse');
    const heroBadge = document.getElementById('display-hero-badge');
    const heroTitle = document.getElementById('display-hero-title');
    const greetingText = document.getElementById('display-greeting-text');
    const invitationSubtext = document.getElementById('display-invitation-subtext');
    const footerThankyou = document.getElementById('display-footer-thankyou');
    const footerCredit = document.getElementById('display-footer-credit');

    if (envBadge && config.envelopeBadge) envBadge.textContent = config.envelopeBadge;
    if (envTitle && config.invitationTitle) envTitle.textContent = config.invitationTitle;
    if (envHint && config.envelopeHint) envHint.textContent = config.envelopeHint;
    if (sealImg && config.sealImage) sealImg.src = config.sealImage;
    if (sacredVerse && config.blessingVerse) sacredVerse.textContent = config.blessingVerse;
    if (heroBadge && config.invitationTitle) heroBadge.textContent = config.invitationTitle;
    if (heroTitle && config.invitationHeader) heroTitle.textContent = config.invitationHeader;
    if (greetingText && config.invitationGreeting) greetingText.textContent = config.invitationGreeting;
    if (invitationSubtext && config.invitationSubtext) invitationSubtext.textContent = config.invitationSubtext;
    if (footerThankyou && config.thankYouText) footerThankyou.textContent = config.thankYouText;
    if (footerCredit && config.footerCredit) footerCredit.textContent = config.footerCredit;

    // Editable headings, subtitles & button labels. Any element tagged with
    // data-cfg-text="key" is populated from config.texts (falls back to defaults).
    const T = Object.assign({}, defaultConfig.texts, config.texts || {});
    document.querySelectorAll('[data-cfg-text]').forEach((el) => {
      const key = el.getAttribute('data-cfg-text');
      if (key && T[key]) el.textContent = T[key];
    });

    // Background Music Playlist (MP3 / audio URL / YouTube). The client picks
    // one track at random and auto-advances to another when it finishes.
    if (window.traditionalAudio && typeof window.traditionalAudio.setPlaylist === 'function') {
      let playlist = Array.isArray(config.bgMusicPlaylist) ? config.bgMusicPlaylist : [];
      const hadTracks = playlist.length > 0;
      // Respect the per-track enable checkbox from the admin music list.
      playlist = playlist.filter(t => t && t.src && t.enabled !== false);
      if (!playlist.length && !hadTracks && config.bgMusicUrl) {
        playlist = [{ type: 'file', src: config.bgMusicUrl, title: 'Background Music' }];
      }
      window.traditionalAudio.setPlaylist(playlist);
    }

    // Section visibility — admin can show/hide blocks with checkboxes.
    // Any section that is not explicitly disabled stays visible (default true).
    const sectionMap = {
      countdown: 'section-countdown',
      parents: 'section-parents',
      video: 'section-video-album',
      schedule: 'section-schedule',
      venue: 'section-venue',
      gift: 'section-gift',
      rsvp: 'section-rsvp',
      guestbook: 'section-guestbook'
    };
    const sectionCfg = config.sections || {};
    Object.keys(sectionMap).forEach(key => {
      const el = document.getElementById(sectionMap[key]);
      if (!el) return;
      const visible = sectionCfg[key] !== false; // hidden only when explicitly false
      el.style.display = visible ? '' : 'none';
    });

    // Couple Names
    const heroGroom = document.getElementById('hero-groom-name');
    const heroBride = document.getElementById('hero-bride-name');
    const badgeGroom = document.getElementById('badge-groom-name');
    const badgeBride = document.getElementById('badge-bride-name');
    if (heroGroom) heroGroom.textContent = config.groomName;
    if (heroBride) heroBride.textContent = config.brideName;
    if (badgeGroom) badgeGroom.textContent = config.groomName;
    if (badgeBride) badgeBride.textContent = config.brideName;

    // Dates
    const solarEl = document.getElementById('hero-solar-date');
    const lunarEl = document.getElementById('hero-lunar-date');
    if (solarEl) solarEl.textContent = config.solarDate;
    if (lunarEl) lunarEl.textContent = config.lunarDate;

    // Parents
    const gfEl = document.getElementById('name-groom-father');
    const gmEl = document.getElementById('name-groom-mother');
    const bfEl = document.getElementById('name-bride-father');
    const bmEl = document.getElementById('name-bride-mother');
    if (gfEl) gfEl.textContent = config.groomFather;
    if (gmEl) gmEl.textContent = config.groomMother;
    if (bfEl) bfEl.textContent = config.brideFather;
    if (bmEl) bmEl.textContent = config.brideMother;

    // Couple photo
    const portraitImg = document.getElementById('couple-portrait-img');
    if (portraitImg && config.couplePhoto) portraitImg.src = config.couplePhoto;

    // Venue
    const vName = document.getElementById('display-venue-name');
    const vAddr = document.getElementById('display-venue-address');
    const vMap = document.getElementById('btn-maps-link');
    if (vName) vName.textContent = config.venueName;
    if (vAddr) vAddr.innerHTML = escapeHtml(config.venueAddress).replace(/\n/g, '<br>');
    if (vMap && config.mapsUrl) vMap.href = config.mapsUrl;

    // Bank & KHQR
    const bAccName = document.getElementById('display-acc-name');
    const bAccNum = document.getElementById('bank-acc-num');
    const bName = document.getElementById('display-bank-name');
    if (bAccName) bAccName.textContent = config.bankAccName;
    if (bAccNum) {
      bAccNum.textContent = config.bankAccNum;
      bAccNum.style.cursor = 'pointer';
      bAccNum.title = 'ចុចដើម្បីបើក App ធនាគារ (Click to open Bank App)';
      bAccNum.onclick = () => {
        const appLink = config.bankAppLink;
        if (appLink && appLink.trim()) {
          window.open(appLink.trim(), '_blank');
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(config.bankAccNum || '').then(() => {
            if (window.showToast) window.showToast('📋 បានចម្លងលេខគណនី');
          });
        }
      };
    }
    if (bName) bName.textContent = config.bankName;

    // Display Custom QR Image if available
    const qrImg = document.getElementById('display-qr-img');
    const qrSvg = document.getElementById('default-qr-svg');
    if (qrImg && qrSvg) {
      if (config.qrImage && config.qrImage.trim()) {
        qrImg.src = config.qrImage.trim();
        qrImg.style.display = 'block';
        qrSvg.style.display = 'none';
      } else {
        qrImg.style.display = 'none';
        qrSvg.style.display = 'block';
      }
    }

    // Timeline list
    const timelineContainer = document.getElementById('timeline-list-container');
    if (timelineContainer && config.schedule && config.schedule.length > 0) {
      timelineContainer.innerHTML = config.schedule.map((item, idx) => `
        <div class="timeline-item reveal-on-scroll reveal-delay-${(idx % 4) + 1}">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${escapeHtml(item.time)}</div>
          <div class="timeline-ceremony">${escapeHtml(item.title)}</div>
          <div class="timeline-desc">${escapeHtml(item.desc || '')}</div>
        </div>
      `).join('');
      observeRevealElements(timelineContainer); // Watch freshly (re)rendered items
      triggerScrollReveal(); // Reveal timeline items already in viewport
    }
    // Video Album Configuration
    const vAlbum = config.videoAlbum || {};
    const videoUrl = config.videoUrl || vAlbum.videoUrl || '';
    const videoTitle = config.videoTitle || vAlbum.title || 'វីដេអូអនុស្សាវរីយ៍ & សាច់រឿងស្នេហា';
    const videoSubtitle = config.videoSubtitle || vAlbum.subtitle || 'Cinematic Wedding Video & Love Story';
    const videoDesc = config.videoDesc || vAlbum.desc || 'សូមទស្សនាវីដេអូអនុស្សាវរីយ៍ដ៏មានអត្ថន័យ និងសាច់រឿងនៃក្តីស្រឡាញ់របស់គូស្វាមីភរិយាថ្មី';
    const videoPoster = config.videoPoster || vAlbum.posterUrl || config.couplePhoto || 'assets/images/couple.jpg';
    const videoTag = config.videoTag || vAlbum.tag || 'Wedding Highlights & Story';

    const vTitleEl = document.getElementById('video-album-title');
    const vSubEl = document.getElementById('video-album-subtitle');
    const vDescEl = document.getElementById('video-album-desc');
    const vTagEl = document.getElementById('video-tag-label');
    const vPlayer = document.getElementById('wedding-video-player');
    const vSource = document.getElementById('wedding-video-source');
    const theaterSource = document.getElementById('theater-video-source');
    const theaterPlayer = document.getElementById('theater-video-player');
    const theaterTitleDisplay = document.getElementById('theater-title-display');

    if (vTitleEl) vTitleEl.textContent = videoTitle;
    if (vSubEl) vSubEl.textContent = videoSubtitle;
    if (vDescEl) vDescEl.textContent = videoDesc;
    if (vTagEl) vTagEl.textContent = videoTag;
    if (theaterTitleDisplay) theaterTitleDisplay.textContent = videoTitle;

    if (vPlayer) {
      if (videoPoster) vPlayer.poster = videoPoster;
      if (videoUrl) {
        if (!vSource.src || !vSource.src.endsWith(videoUrl)) {
          vSource.src = videoUrl;
          vPlayer.load();
        }
        if (theaterSource && (!theaterSource.src || !theaterSource.src.endsWith(videoUrl))) {
          theaterSource.src = videoUrl;
          if (theaterPlayer) theaterPlayer.load();
        }
      }
    }

    // Poster gallery slideshow (2+ images) — new animations
    let posterList = Array.isArray(config.videoPosters) ? config.videoPosters.slice() : [];
    if (!posterList.length && Array.isArray(vAlbum.posters)) posterList = vAlbum.posters.slice();
    if (!posterList.length && videoPoster) posterList = [videoPoster];
    setupPosterGallery(posterList);
  }

  // Apply local/cached config immediately for fast render
  applyInvitationConfig(currentConfig);

  // ── Connection Status Indicator (Removed from client view; only enabled if ?debug=1) ──
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';
  let connectionStatus = null;
  if (isDebugMode) {
    connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; z-index: 9999;
      padding: 6px 12px; border-radius: var(--radius-full); font-size: 0.7rem;
      font-weight: 700; backdrop-filter: blur(8px); border: 1px solid;
      transition: all 0.3s ease; opacity: 0.85;
      cursor: pointer;
    `;
    connectionStatus.title = 'Click to open Database Test / Retry';
    document.body.appendChild(connectionStatus);
    connectionStatus.addEventListener('click', () => {
      if (typeof openDbTestModal === 'function') openDbTestModal();
    });
  }

  function updateConnectionStatus(connected, source = 'Supabase', details = '') {
    const el = document.getElementById('connection-status');
    if (!el) return;
    if (connected) {
      el.textContent = `🟢 Live: ${source}`;
      el.style.background = 'rgba(46, 204, 113, 0.2)';
      el.style.borderColor = '#2ecc71';
      el.style.color = '#2ecc71';
    } else {
      el.textContent = `🟡 Offline: ${source}${details ? ' (' + details + ')' : ''}`;
      el.style.background = 'rgba(241, 196, 15, 0.2)';
      el.style.borderColor = '#f1c40f';
      el.style.color = '#f1c40f';
    }
  }

  // Allow clicking to retry connection
  if (connectionStatus) {
    connectionStatus.addEventListener('click', () => {
      if (window.appSupabase) {
        window.appSupabase.loadCredentials();
        loadAllDataFromSupabase();
      }
    });
  }

  // ── Supabase Data Loading with Live Sync ──────────────────────────────────────
  async function loadAllDataFromSupabase() {
    // Ensure credentials are loaded
    if (window.appSupabase && !window.appSupabase.isConfigured) {
      window.appSupabase.loadCredentials();
    }

    if (!window.appSupabase || !window.appSupabase.isConfigured) {
      console.log('[Data] Supabase not configured, using local fallback');
      updateConnectionStatus(false, 'Local Cache', 'No credentials');
      return false;
    }

    try {
      // 1. Load Config from Supabase (authoritative)
      const config = await window.appSupabase.fetchConfig();
      if (config && Object.keys(config).length > 0) {
        currentConfig = Object.assign({}, defaultConfig, config);
        applyInvitationConfig(currentConfig);
        restartCountdown();
        console.log('[Data] Config loaded from Supabase ✅');
      }

      // 2. Load Wishes from Supabase (authoritative)
      const wishes = await window.appSupabase.fetchWishes();
      if (wishes && wishes.length > 0) {
        localStorage.setItem('khmer_wedding_wishes', JSON.stringify(wishes));
        renderWishes();
        console.log('[Data] Wishes loaded from Supabase ✅');
      }

      // 3. Load RSVPs from Supabase (authoritative) - for admin reference
      const rsvps = await window.appSupabase.fetchRsvps();
      if (rsvps && rsvps.length > 0) {
        console.log('[Data] RSVPs loaded from Supabase ✅', rsvps.length);
      }

      updateConnectionStatus(true, 'Supabase Cloud');
      return true;
    } catch (err) {
      console.warn('[Data] Supabase load failed, using local fallback:', err);
      updateConnectionStatus(false, 'Local Cache', err.message?.slice(0, 30) || 'Error');
      return false;
    }
  }

  // Load all data from Supabase on startup
  loadAllDataFromSupabase();

  // ── Supabase Real-time Auto-Update ──────────────────────────────────────────
  // Whenever any table changes in Supabase, the page updates automatically
  // without a refresh. Works for: invitation_config, wishes, rsvps.
  let realtimeReady = false;

  function setupRealtime() {
    if (realtimeReady) return;
    if (!window.appSupabase || !window.appSupabase.isConfigured) return;

    realtimeReady = true;
    console.log('[Realtime] Subscribing to Supabase real-time updates...');

    // 🔴 Live config: re-apply ALL page fields the moment admin saves in Supabase
    window.appSupabase.subscribeToConfig((newCfg) => {
      currentConfig = Object.assign({}, defaultConfig, newCfg);
      applyInvitationConfig(currentConfig);
      restartCountdown();
      console.log('[Realtime] Invitation config updated from Supabase ✅');
      showToast('🔄 កំណត់ត្រាថ្មីត្រូវបានទទួលពី Supabase!');
    });

    // 💬 Live wishes: re-render guestbook wall whenever a wish is added/deleted
    window.appSupabase.subscribeToWishes(() => {
      loadAllDataFromSupabase(); // Full refresh to get latest from Supabase
      console.log('[Realtime] Wishes wall refreshed from Supabase ✅');
      showToast('💬 ពាក្យជូនពរថ្មីត្រូវបានបន្ថែម!');
    });

    // ✉️ Live RSVPs: refresh when new RSVP comes in
    window.appSupabase.subscribeToRsvps(() => {
      console.log('[Realtime] RSVPs updated in Supabase ✅');
    });

    // Periodic health check
    setInterval(async () => {
      try {
        const { data, error } = await window.appSupabase.client
          .from('invitation_config')
          .select('id')
          .eq('id', 'wedding_main')
          .limit(1);
        if (!error) updateConnectionStatus(true, 'Supabase Cloud');
      } catch {
        updateConnectionStatus(false, 'Local Cache', 'Connection lost');
      }
    }, 30000); // Check every 30 seconds
  }

  // ── Polling Auto-Sync ───────────────────────────────────────────────────────
  // Reliable fallback that keeps the client site in sync with the database even
  // when Supabase Realtime is not enabled on the tables. Every few seconds it
  // compares the live config/wishes with what is on screen and re-renders the
  // page automatically the moment the admin saves new data.
  let lastConfigSig = '';
  let lastWishesSig = '';
  let pollTimer = null;

  function signatureOf(value) {
    try {
      return JSON.stringify(value, (key, val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return Object.keys(val).sort().reduce((acc, k) => { acc[k] = val[k]; return acc; }, {});
        }
        return val;
      });
    } catch (e) { return ''; }
  }

  async function pollForUpdates() {
    if (!window.appSupabase || !window.appSupabase.isConfigured) return;

    // 1. Invitation config → re-apply all page fields live
    try {
      const cfg = await window.appSupabase.fetchConfig();
      if (cfg && Object.keys(cfg).length > 0) {
        const sig = signatureOf(cfg);
        if (lastConfigSig && sig !== lastConfigSig) {
          currentConfig = Object.assign({}, defaultConfig, cfg);
          applyInvitationConfig(currentConfig);
          restartCountdown();
          showToast('🔄 ទិន្នន័យថ្មីត្រូវបានធ្វើបច្ចុប្បន្នភាព!');
          console.log('[AutoSync] Config changed → live update ✅');
        }
        lastConfigSig = sig;
      }
    } catch (e) { /* offline; retry next tick */ }

    // 2. Wishes / guestbook → re-render wall
    try {
      const wishes = await window.appSupabase.fetchWishes();
      if (wishes && wishes.length > 0) {
        const sig = signatureOf(wishes);
        if (lastWishesSig && sig !== lastWishesSig) {
          localStorage.setItem('khmer_wedding_wishes', JSON.stringify(wishes));
          renderWishes();
          showToast('💬 ពាក្យជូនពរថ្មីត្រូវបានបន្ថែម!');
          console.log('[AutoSync] Wishes changed → live update ✅');
        }
        lastWishesSig = sig;
      }
    } catch (e) { /* offline; retry next tick */ }
  }

  function startPollingSync() {
    if (pollTimer) return;
    pollForUpdates();
    pollTimer = setInterval(() => {
      if (document.hidden) return; // save bandwidth on background tabs
      pollForUpdates();
    }, 8000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) pollForUpdates();
    });
    console.log('[AutoSync] Polling started (every 8s)');
  }

  // Connect immediately if already configured, or as soon as the auto-connect
  // retry succeeds (handles the Supabase CDN loading after this script).
  if (window.appSupabase && window.appSupabase.isConfigured) {
    setupRealtime();
    startPollingSync();
  } else {
    console.log('[Realtime] Waiting for Supabase auto-connect...');
    window.addEventListener('supabase-ready', () => {
      loadAllDataFromSupabase().then(() => {
        setupRealtime();
        startPollingSync();
      });
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  // 3. Dynamic Countdown Timer
  let countdownInterval = null;
  let targetDate = new Date(currentConfig.targetDateTime || '2026-11-15T07:00:00+07:00').getTime();

  function restartCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    targetDate = new Date(currentConfig.targetDateTime || '2026-11-15T07:00:00+07:00').getTime();
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      const dEl = document.getElementById('cd-days');
      const hEl = document.getElementById('cd-hours');
      const mEl = document.getElementById('cd-mins');
      const sEl = document.getElementById('cd-secs');
      if (dEl) dEl.textContent = '00';
      if (hEl) hEl.textContent = '00';
      if (mEl) mEl.textContent = '00';
      if (sEl) sEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    const dEl = document.getElementById('cd-days');
    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-mins');
    const sEl = document.getElementById('cd-secs');

    if (dEl) dEl.textContent = pad(days);
    if (hEl) hEl.textContent = pad(hours);
    if (mEl) mEl.textContent = pad(minutes);
    if (sEl) sEl.textContent = pad(seconds);
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);

  // 4. Add to Calendar — opens the NATIVE calendar app on mobile
  //    (Android: intent:// INSERT event, iOS: text/calendar data URI),
  //    and Google Calendar in a new tab on desktop.
  const btnCalendar = document.getElementById('btn-add-calendar');
  if (btnCalendar) {
    btnCalendar.addEventListener('click', () => {
      // Use live config values from the database
      const groomName = currentConfig.groomName || 'ជា វិបុល';
      const brideName = currentConfig.brideName || 'ស៊ុន ទេវី';
      const venueName = currentConfig.venueName || 'Koh Pich Exhibition Center';
      const venueAddressRaw = (currentConfig.venueAddress || 'Phnom Penh');
      const venueAddress = venueAddressRaw.replace(/\n/g, ', ').replace(/📍.*?[:：]\s*/g, '').trim();

      const titleText = `ពិធីសិរីមង្គលអាពាហ៍ពិពាហ៍ ${groomName} ❤️ ${brideName}`;
      const detailsText = `សូមគោរពអញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីមង្គលការរបស់ ${groomName} និង ${brideName} នៅ${venueName}។`;
      const locationText = venueAddress || venueName;

      // Build dates from targetDateTime in config
      const startISO = currentConfig.targetDateTime || '2026-11-15T07:00:00+07:00';
      const startD = new Date(startISO);
      const endD = new Date(startD.getTime() + 8 * 60 * 60 * 1000); // +8 hours

      function toCalDate(d) {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      }
      const dates = `${toCalDate(startD)}/${toCalDate(endD)}`;

      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE`
        + `&text=${encodeURIComponent(titleText)}`
        + `&details=${encodeURIComponent(detailsText)}`
        + `&location=${encodeURIComponent(locationText)}`
        + `&dates=${dates}`;

      // Properly escaped iCalendar (.ics) payload
      function icsEscape(s) {
        return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
      }
      function buildICS() {
        return [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Khmer E-Invitation//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${Date.now()}@khmer-e-invitation`,
          `DTSTAMP:${toCalDate(new Date())}`,
          `DTSTART:${toCalDate(startD)}`,
          `DTEND:${toCalDate(endD)}`,
          `SUMMARY:${icsEscape(titleText)}`,
          `DESCRIPTION:${icsEscape(detailsText)}`,
          `LOCATION:${icsEscape(locationText)}`,
          'BEGIN:VALARM',
          'TRIGGER:-PT3H',
          'ACTION:DISPLAY',
          'DESCRIPTION:Reminder',
          'END:VALARM',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
      }

      const ua = navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua)
        && !window.MSStream
        || (/iPhone|iPad|iPod/i.test(ua))
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      // ── Android: hand the event to the installed Calendar app ──────────────
      if (isAndroid) {
        const intentUrl = 'intent:#Intent;action=android.intent.action.INSERT;'
          + 'type=vnd.android.cursor.item/event;'
          + `S.title=${encodeURIComponent(titleText)};`
          + `S.description=${encodeURIComponent(detailsText)};`
          + `S.eventLocation=${encodeURIComponent(locationText)};`
          + `l.beginTime=${startD.getTime()};`
          + `l.endTime=${endD.getTime()};`
          + 'end';
        showToast('📅 កំពុងបើកកម្មវិធីប្រតិទិន...');
        const fallback = setTimeout(() => {
          // No calendar app handled the intent → open ICS so the OS can offer an app
          if (!document.hidden) triggerIcsDownload();
        }, 1500);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) clearTimeout(fallback);
        }, { once: true });
        window.location.href = intentUrl;
        return;
      }

      // ── iOS / iPadOS: text/calendar opens the Calendar "Add Event" sheet ────
      if (isIOS) {
        showToast('📅 កំពុងបើកកម្មវិធីប្រតិទិន...');
        const ics = buildICS();
        window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
        return;
      }

      // ── Desktop: Google Calendar in a new tab (fallback: download .ics) ─────
      function triggerIcsDownload() {
        try {
          const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wedding-invitation.ics';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (e) {
          window.open(googleCalUrl, '_blank');
        }
      }

      showToast('📅 កំពុងបើកកម្មវិធីប្រតិទិន...');
      window.open(googleCalUrl, '_blank');
    });
  }

  // 5. RSVP Radio Button Toggle
  const labelAttending = document.getElementById('label-attending');
  const labelDeclining = document.getElementById('label-declining');
  const groupGuestCount = document.getElementById('group-guest-count');
  const radios = document.querySelectorAll('input[name="attendance"]');

  radios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'attending') {
        labelAttending.classList.add('active');
        labelDeclining.classList.remove('active');
        if (groupGuestCount) groupGuestCount.style.display = 'block';
      } else {
        labelDeclining.classList.add('active');
        labelAttending.classList.remove('active');
        if (groupGuestCount) groupGuestCount.style.display = 'none';
      }
    });
  });

  // 6. Wishes & Guestbook Wall Initial State & Persistence
  const defaultWishes = [
    {
      name: 'ឯកឧត្តម លី សុផាត',
      date: 'ថ្មីៗនេះ',
      message: 'សូមប្រសិទ្ធពរជ័យមង្គល សិរីសួស្តី វិបុលសុខគ្រប់ប្រការដល់គូស្វាមីភរិយាថ្មី ស្រឡាញ់គ្នារហូតដល់ចាស់កោងខ្នង!'
    },
    {
      name: 'លោកជំទាវ ម៉េង គន្ធា',
      date: 'ថ្មីៗនេះ',
      message: 'អបអរសាទរពិធីមង្គលការ! សូមឱ្យគ្រួសារថ្មីពោរពេញដោយសុភមង្គល ទ្រព្យសម្បត្តិហូរហៀរ និងត្រជាក់ត្រជុំដូចទឹកអង្គរ។'
    },
    {
      name: 'មិត្តភក្តិរួមការងារ (ABA Team)',
      date: 'ថ្មីៗនេះ',
      message: 'Congratulations Vibol & Devi! Wishing you both a lifetime of eternal love, prosperity, and happiness!'
    }
  ];

  function getDeletedWishes() {
    try {
      const s = localStorage.getItem('khmer_wedding_wishes_deleted');
      const arr = s ? JSON.parse(s) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function isWishDeleted(w, tombstones) {
    return (tombstones || []).some(t => t && t.name === (w.name || '') && t.message === (w.message || ''));
  }

  function getStoredWishes() {
    try {
      const stored = localStorage.getItem('khmer_wedding_wishes');
      // An existing key (even an empty list) is authoritative — do NOT fall back
      // to the sample wishes, otherwise deleted wishes would reappear.
      if (stored !== null) {
        let parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) parsed = [];
        parsed = parsed.filter(w => w && w.name !== 'sadasd' && w.message !== 'ggode' && w.name !== 'test');
        localStorage.setItem('khmer_wedding_wishes', JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      return defaultWishes;
    }
    // First run only: seed the sample wishes once.
    localStorage.setItem('khmer_wedding_wishes', JSON.stringify(defaultWishes));
    return defaultWishes;
  }

  async function renderWishes() {
    const wallEl = document.getElementById('wishes-wall');
    if (!wallEl) return;

    // Priority: Supabase (authoritative) > LocalStorage > Defaults
    let wishes = [];

    if (window.appSupabase && window.appSupabase.isConfigured) {
      try {
        const remoteWishes = await window.appSupabase.fetchWishes();
        if (remoteWishes && remoteWishes.length > 0) {
          if (localStorage.getItem('khmer_wedding_wishes_cleared') === '1') {
            wishes = [];
          } else {
            const tombstones = getDeletedWishes();
            wishes = remoteWishes
              .filter(w => w && w.name !== 'sadasd' && w.message !== 'ggode')
              .filter(w => !isWishDeleted(w, tombstones));
            localStorage.setItem('khmer_wedding_wishes', JSON.stringify(wishes));
          }
        }
      } catch (err) {
        console.warn('Remote wishes fetch failed, using local:', err);
      }
    }

    // Fallback to localStorage if Supabase not available or empty
    if (wishes.length === 0) {
      wishes = getStoredWishes();
    }

    // Clean any remaining spam test
    wishes = wishes.filter(w => w && w.name !== 'sadasd' && w.message !== 'ggode');

    wallEl.innerHTML = wishes.map((item) => `
      <div class="wish-item">
        <div class="wish-header">
          <span class="wish-author">${escapeHtml(item.name || '')}</span>
          <span class="wish-date">${escapeHtml(item.date || item.date_display || 'ថ្មីៗ')}</span>
        </div>
        <p class="wish-message">${escapeHtml(item.message || '')}</p>
      </div>
    `).join('');
  }

  renderWishes();

  // 7. RSVP Submission Handler (Synced with Server Database & Supabase Cloud)
  const rsvpForm = document.getElementById('rsvp-form');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('guest-name-input').value.trim();
      const phone = document.getElementById('guest-phone-input').value.trim();
      const attendance = document.querySelector('input[name="attendance"]:checked').value;
      const count = document.getElementById('guest-count-select').value;
      const wishesText = document.getElementById('guest-wishes-input').value.trim();

      if (!name) {
        showToast('សូមបញ្ចូលឈ្មោះរបស់លោកអ្នក');
        return;
      }

      // Add to Guestbook if message provided
      if (wishesText) {
        const currentWishes = getStoredWishes();
        const newWish = {
          name: name,
          date: 'ទើបតែផ្ញើ',
          message: wishesText
        };
        currentWishes.unshift(newWish);
        localStorage.setItem('khmer_wedding_wishes', JSON.stringify(currentWishes));

        // Sync wish to Server Database & Supabase
        if (window.appSupabase) {
          await window.appSupabase.submitWish(newWish);
        }
        await renderWishes();
      }

      // Save RSVP locally, server database, and Supabase cloud
      const rsvpData = {
        name,
        phone,
        attendance,
        count: attendance === 'attending' ? parseInt(count) : 0,
        wishes: wishesText,
        submittedAt: new Date().toISOString()
      };

      if (window.appSupabase) {
        await window.appSupabase.submitRsvp(rsvpData);
      } else {
        localStorage.setItem('khmer_wedding_rsvp_' + Date.now(), JSON.stringify(rsvpData));
        try {
          await fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rsvpData)
          });
        } catch (e) { }
      }

      if (attendance === 'attending') {
        // Fire grand celebratory golden confetti!
        fireCelebrationConfetti(window.innerWidth / 2, window.innerHeight * 0.7, 90);
        showToast('🎉 អរគុណសម្រាប់ការបញ្ជាក់ចូលរួម! ជួបគ្នាក្នុងថ្ងៃសិរីមង្គល!');
      } else {
        showToast('🙏 អរគុណច្រើនចំពោះសារជូនពរដ៏មានអត្ថន័យ!');
      }
      document.getElementById('guest-wishes-input').value = '';
    });
  }

  // 8. Digital Gift Modal (KHQR)
  const qrModal = document.getElementById('qr-modal');
  const btnOpenQr = document.getElementById('btn-open-qr-modal');
  const btnCloseQr = document.getElementById('btn-close-qr-modal');
  const btnCopyAcc = document.getElementById('btn-copy-acc');

  if (btnOpenQr && qrModal) {
    btnOpenQr.addEventListener('click', () => {
      qrModal.classList.add('active');
    });
  }

  if (btnCloseQr && qrModal) {
    btnCloseQr.addEventListener('click', () => {
      qrModal.classList.remove('active');
    });
  }

  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.remove('active');
      }
    });
  }

  if (btnCopyAcc) {
    btnCopyAcc.addEventListener('click', () => {
      // Use live config value (updated after remote fetch)
      const accText = currentConfig.bankAccNum || '001 888 999';
      const accClean = accText.replace(/\s+/g, '').replace(/\(.*\)/g, '').trim();
      navigator.clipboard.writeText(accClean).then(() => {
        showToast('✅ បានចម្លងលេខគណនី: ' + accText);
      }).catch(() => {
        showToast('លេខគណនី៖ ' + accText);
      });
    });
  }

  // Open Bank App button in QR Modal
  const btnOpenBankApp = document.getElementById('btn-open-bank-app');
  if (btnOpenBankApp) {
    btnOpenBankApp.addEventListener('click', () => {
      const appLink = currentConfig.bankAppLink;
      if (appLink && appLink.trim()) {
        window.open(appLink.trim(), '_blank');
        showToast('🏦 បើក App ធនាគារ...');
      } else {
        // Fallback: copy account number
        const accText = currentConfig.bankAccNum || '001 888 999';
        const accClean = accText.replace(/\s+/g, '').replace(/\(.*\)/g, '').trim();
        navigator.clipboard.writeText(accClean).then(() => {
          showToast('📋 បានចម្លងលេខគណនី (មិនមាន Link បើក App)');
        });
      }
    });
  }

  // 9. Generate Personalized VIP Link for Host (Admin Only - /generate or ?generate)
  const isAdminMode = window.location.pathname.includes('/generate') ||
    window.location.search.includes('generate') ||
    window.location.search.includes('admin') ||
    window.location.hash === '#generate';

  const adminSection = document.getElementById('section-admin-generate');
  const btnGenLink = document.getElementById('btn-generate-link');
  const customNameInput = document.getElementById('custom-link-name-input');
  const linkBox = document.getElementById('generated-link-box');
  const linkUrlDisplay = document.getElementById('generated-link-url');
  const btnPreviewLink = document.getElementById('btn-preview-link');
  const btnCopyAgain = document.getElementById('btn-copy-again');
  const vipGuestListEl = document.getElementById('vip-guest-list');

  let currentGeneratedUrl = '';

  if (adminSection) {
    if (isAdminMode) {
      adminSection.style.display = 'block';
      adminSection.classList.add('is-revealed');
      renderVipGuestList();
    } else {
      adminSection.style.display = 'none';
    }
  }

  function getCleanBaseInvitationUrl() {
    // If inside /generate or /generate/index.html, strip /generate to point to main invitation
    let path = window.location.pathname.replace(/\/generate(?:\/index\.html)?\/?$/, '');
    if (!path.endsWith('/') && !path.endsWith('.html')) {
      path += '/';
    }
    return window.location.origin + path;
  }

  function getStoredVipGuests() {
    try {
      const stored = localStorage.getItem('khmer_vip_guests');
      return stored ? JSON.parse(stored) : [
        { name: 'ឯកឧត្តម លី សុផាត', createdAt: '១៤ តុលា ២០២៦' },
        { name: 'លោកជំទាវ ម៉េង គន្ធា', createdAt: '១៤ តុលា ២០២៦' }
      ];
    } catch {
      return [];
    }
  }

  function renderVipGuestList() {
    if (!vipGuestListEl) return;
    const guests = getStoredVipGuests();
    const baseUrl = getCleanBaseInvitationUrl();

    if (guests.length === 0) {
      vipGuestListEl.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted);">មិនទាន់មានភ្ញៀវត្រូវបានបង្កើតនៅឡើយ</div>';
      return;
    }

    vipGuestListEl.innerHTML = guests.map((g, idx) => {
      const guestUrl = `${baseUrl}?to=${encodeURIComponent(g.name)}`;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border: 1px solid rgba(229,185,85,0.2); border-radius: var(--radius-sm); padding: 8px 12px; gap: 8px;">
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-gold-light); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(g.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(g.createdAt || '')}</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-gold-secondary ripple-effect btn-copy-guest" data-url="${escapeHtml(guestUrl)}" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 0; width: auto;">
              📋 ចម្លង
            </button>
            <a href="${escapeHtml(guestUrl)}" target="_blank" class="btn-gold-secondary ripple-effect" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 0; width: auto; text-decoration: none;">
              👁️ មើល
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to guest list copy buttons
    vipGuestListEl.querySelectorAll('.btn-copy-guest').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const urlToCopy = btn.getAttribute('data-url');
        navigator.clipboard.writeText(urlToCopy).then(() => {
          showToast('✅ បានចម្លង Link ភ្ញៀវ VIP រួចរាល់!');
        });
      });
    });
  }

  if (btnGenLink && customNameInput) {
    btnGenLink.addEventListener('click', () => {
      const name = customNameInput.value.trim();
      if (!name) {
        showToast('សូមបញ្ចូលឈ្មោះភ្ញៀវជាមុនសិន');
        return;
      }
      const baseUrl = getCleanBaseInvitationUrl();
      currentGeneratedUrl = `${baseUrl}?to=${encodeURIComponent(name)}`;

      if (linkUrlDisplay) linkUrlDisplay.textContent = currentGeneratedUrl;
      if (linkBox) linkBox.style.display = 'block';

      // Save to VIP guest list
      const guests = getStoredVipGuests();
      guests.unshift({
        name: name,
        createdAt: 'ទើបតែបង្កើត'
      });
      localStorage.setItem('khmer_vip_guests', JSON.stringify(guests));
      renderVipGuestList();

      navigator.clipboard.writeText(currentGeneratedUrl).then(() => {
        showToast(`✅ បានបង្កើត និងចម្លង Link សម្រាប់៖ "${name}"`);
      }).catch(() => {
        showToast(`✅ បានបង្កើត Link រួចរាល់!`);
      });
    });
  }

  if (btnPreviewLink) {
    btnPreviewLink.addEventListener('click', () => {
      if (currentGeneratedUrl) {
        window.open(currentGeneratedUrl, '_blank');
      }
    });
  }

  if (btnCopyAgain) {
    btnCopyAgain.addEventListener('click', () => {
      if (currentGeneratedUrl) {
        navigator.clipboard.writeText(currentGeneratedUrl).then(() => {
          showToast('📋 បានចម្លង Link ម្តងទៀតរួចរាល់!');
        });
      }
    });
  }

  // 10. Floating Share Button
  const btnShare = document.getElementById('btn-share');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const shareData = {
        title: 'សិរីសួស្តី អាពាហ៍ពិពាហ៍ | ជា វិបុល ❤️ ស៊ុន ទេវី',
        text: 'សូមគោរពអញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីមង្គលការកូនប្រុស-កូនស្រីរបស់យើងខ្ញុំ',
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData).catch(() => { });
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast('🔗 បានចម្លងតំណភ្ជាប់សំបុត្រ (Link Copied)!');
        });
      }
    });
  }

  // 11. Wedding Video Album Interaction & Animations
  const weddingVideo = document.getElementById('wedding-video-player');
  const videoOverlay = document.getElementById('video-play-overlay');
  const btnVideoPlay = document.getElementById('btn-video-play-trigger');
  const btnTheaterMode = document.getElementById('btn-theater-mode');
  const theaterModal = document.getElementById('theater-modal');
  const btnCloseTheater = document.getElementById('btn-close-theater');
  const theaterVideo = document.getElementById('theater-video-player');

  function startVideoPlayback() {
    if (!weddingVideo) return;
    stopPosterGalleryTimer();
    hidePosterGallery();
    // Auto-pause background music so audio doesn't clash
    if (window.traditionalAudio && window.traditionalAudio.isPlaying) {
      window.traditionalAudio.stopBackgroundMusic();
      if (btnMusic) btnMusic.classList.remove('spinning');
    }
    weddingVideo.play().then(() => {
      if (videoOverlay) videoOverlay.classList.add('hidden');
    }).catch(e => {
      console.warn('Video play prevented or empty source:', e);
      // If no source yet, inform user
      showToast('🎬 សូមផ្ទុកវីដេអូ ឬបញ្ចូល URL ក្នុងផ្ទាំង Admin');
    });
  }

  if (videoOverlay) {
    videoOverlay.addEventListener('click', startVideoPlayback);
  }
  if (btnVideoPlay) {
    btnVideoPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      startVideoPlayback();
    });
  }

  if (weddingVideo) {
    weddingVideo.addEventListener('play', () => {
      if (videoOverlay) videoOverlay.classList.add('hidden');
      stopPosterGalleryTimer();
      hidePosterGallery();
      if (window.traditionalAudio && window.traditionalAudio.isPlaying) {
        window.traditionalAudio.stopBackgroundMusic();
        if (btnMusic) btnMusic.classList.remove('spinning');
      }
    });
    weddingVideo.addEventListener('pause', () => {
      if (weddingVideo.currentTime === 0 || weddingVideo.ended) {
        if (videoOverlay) videoOverlay.classList.remove('hidden');
        showPosterGallery();
        startPosterGalleryTimer();
      }
    });
    weddingVideo.addEventListener('ended', () => {
      if (videoOverlay) videoOverlay.classList.remove('hidden');
      showPosterGallery();
      startPosterGalleryTimer();
    });
  }

  if (btnTheaterMode && theaterModal) {
    btnTheaterMode.addEventListener('click', () => {
      theaterModal.classList.add('active');
      if (weddingVideo && !weddingVideo.paused) {
        weddingVideo.pause();
      }
      if (theaterVideo && weddingVideo) {
        theaterVideo.currentTime = weddingVideo.currentTime;
        theaterVideo.play().catch(() => { });
      }
    });
  }

  if (btnCloseTheater && theaterModal) {
    btnCloseTheater.addEventListener('click', () => {
      theaterModal.classList.remove('active');
      if (theaterVideo) theaterVideo.pause();
    });
  }

  if (theaterModal) {
    theaterModal.addEventListener('click', (e) => {
      if (e.target === theaterModal) {
        theaterModal.classList.remove('active');
        if (theaterVideo) theaterVideo.pause();
      }
    });
  }

  // 12. Database Connection Test & Live Data Inspector
  const dbTestModal = document.getElementById('db-test-modal');
  const btnCloseDbTest = document.getElementById('btn-close-db-test');
  const btnModalTestDb = document.getElementById('btn-modal-test-db');
  const btnModalTestSupabase = document.getElementById('btn-modal-test-supabase');
  const btnModalFetchData = document.getElementById('btn-modal-fetch-data');
  const modalStatusBadge = document.getElementById('modal-db-status-badge');
  const modalStatusDetail = document.getElementById('modal-db-status-detail');
  const modalDataContainer = document.getElementById('modal-db-data-container');
  const modalDataContent = document.getElementById('modal-db-data-content');
  const modalCounts = document.getElementById('modal-db-counts');

  function openDbTestModal() {
    if (dbTestModal) {
      dbTestModal.style.display = 'flex';
      runServerDbTest();
    }
  }

  window.openDbTestModal = openDbTestModal;

  if (new URLSearchParams(window.location.search).get('test_db') === '1') {
    openDbTestModal();
  }

  if (btnCloseDbTest && dbTestModal) {
    btnCloseDbTest.addEventListener('click', () => {
      dbTestModal.style.display = 'none';
    });
  }

  if (dbTestModal) {
    dbTestModal.addEventListener('click', (e) => {
      if (e.target === dbTestModal) {
        dbTestModal.style.display = 'none';
      }
    });
  }

  async function runServerDbTest() {
    if (!modalStatusBadge) return;
    modalStatusBadge.className = 'db-status-badge';
    modalStatusBadge.textContent = '⏳ កំពុងតេស្ត... (Testing)';
    modalStatusDetail.textContent = 'កំពុងតភ្ជាប់ទៅ Server Database (/api/test-db)...';

    const t0 = performance.now();
    try {
      const res = await fetch('/api/test-db');
      const latency = Math.round(performance.now() - t0);
      if (res.ok) {
        const data = await res.json();
        modalStatusBadge.className = 'db-status-badge connected';
        modalStatusBadge.textContent = `🟢 Connected (${latency}ms)`;
        modalStatusDetail.innerHTML = `
          <strong>ជោគជ័យ!</strong> បានភ្ជាប់ទៅ Database ឯកសារ <code>${escapeHtml(data.databasePath || 'database/invitation_data.json')}</code> (${data.databaseSizeBytes || 0} bytes)<br>
          ទិន្នន័យក្នុង Database: RSVPs: <strong>${data.counts?.rsvps ?? 0}</strong>, Wishes: <strong>${data.counts?.wishes ?? 0}</strong>, Config: <strong>${data.counts?.configFields ?? 0} fields</strong>.
        `;
        renderDbData(data.data, data.counts);
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      modalStatusBadge.className = 'db-status-badge error';
      modalStatusBadge.textContent = '🔴 បរាជ័យ (Failed)';
      modalStatusDetail.textContent = 'មិនអាចតភ្ជាប់ទៅ Server Database បានទេ: ' + err.message;
    }
  }

  async function runSupabaseTest() {
    if (!modalStatusBadge) return;
    modalStatusBadge.className = 'db-status-badge';
    modalStatusBadge.textContent = '⏳ កំពុងតេស្ត Supabase...';
    modalStatusDetail.textContent = 'កំពុងពិនិត្យការតភ្ជាប់ Supabase Cloud...';

    if (window.appSupabase && window.appSupabase.loadCredentials) {
      window.appSupabase.loadCredentials();
    }

    if (!window.appSupabase || !window.appSupabase.isConfigured) {
      modalStatusBadge.className = 'db-status-badge error';
      modalStatusBadge.textContent = '🟡 មិនទាន់កំណត់ (Not Configured)';
      modalStatusDetail.innerHTML = 'Supabase Cloud មិនទាន់ត្រូវបានបញ្ចូល URL & Anon Key នៅឡើយទេ។ លោកអ្នកអាចកំណត់ក្នុងផ្ទាំង <a href="databasecloud/" style="color:var(--primary-gold)">Cloud Sync</a>។';
      return;
    }

    const t0 = performance.now();
    try {
      const { data, error } = await window.appSupabase.client
        .from('invitation_config')
        .select('id')
        .limit(1);
      const latency = Math.round(performance.now() - t0);
      if (!error) {
        modalStatusBadge.className = 'db-status-badge connected';
        modalStatusBadge.textContent = `🟢 Supabase Connected (${latency}ms)`;
        modalStatusDetail.textContent = `ភ្ជាប់ Supabase Cloud ដោយជោគជ័យ! URL: ${window.appSupabase.url}`;
      } else {
        throw error;
      }
    } catch (err) {
      modalStatusBadge.className = 'db-status-badge error';
      modalStatusBadge.textContent = '🔴 Supabase Error';
      modalStatusDetail.textContent = 'បរាជ័យក្នុងការតភ្ជាប់ Supabase: ' + err.message;
    }
  }

  function renderDbData(dbData, counts) {
    if (!modalDataContainer || !modalDataContent) return;
    modalDataContainer.style.display = 'block';
    if (counts && modalCounts) {
      modalCounts.textContent = `RSVPs: ${counts.rsvps} | Wishes: ${counts.wishes}`;
    }

    let html = '';
    const rsvps = dbData?.rsvps || [];
    const wishes = dbData?.wishes || [];

    html += `<div style="font-size:0.8rem; font-weight:700; color:#85e8ba; margin-top:4px;">💌 ពាក្យជូនពរ (Wishes - ${wishes.length} នាក់)</div>`;
    if (wishes.length === 0) {
      html += `<div style="font-size:0.75rem; color:var(--text-muted);">គ្មានពាក្យជូនពរនៅឡើយទេ</div>`;
    } else {
      wishes.slice(0, 5).forEach(w => {
        html += `
          <div class="db-data-card">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:var(--primary-gold-light);">
              <span>👤 ${escapeHtml(w.name || 'ភ្ញៀវ')}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(w.date || w.date_display || '')}</span>
            </div>
            <div style="font-size:0.76rem; color:var(--text-cream); margin-top:3px;">${escapeHtml(w.message || '')}</div>
          </div>
        `;
      });
    }

    html += `<div style="font-size:0.8rem; font-weight:700; color:#5dade2; margin-top:8px;">📋 បញ្ជាក់វត្តមាន (RSVPs - ${rsvps.length} នាក់)</div>`;
    if (rsvps.length === 0) {
      html += `<div style="font-size:0.75rem; color:var(--text-muted);">គ្មាន RSVP នៅឡើយទេ</div>`;
    } else {
      rsvps.slice(0, 5).forEach(r => {
        const isAttending = r.attendance === 'attending';
        html += `
          <div class="db-data-card">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#fff;">
              <span>👤 ${escapeHtml(r.name || 'ភ្ញៀវ')} (${escapeHtml(r.phone || 'គ្មានលេខ')})</span>
              <span style="color: ${isAttending ? '#2ecc71' : '#e74c3c'}; font-size:0.72rem;">
                ${isAttending ? '✅ ចូលរួម' : '❌ មិនចូលរួម'} (${r.count || 1} នាក់)
              </span>
            </div>
            ${r.wishes ? `<div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">💬 ${escapeHtml(r.wishes)}</div>` : ''}
          </div>
        `;
      });
    }

    modalDataContent.innerHTML = html;
  }

  if (btnModalTestDb) btnModalTestDb.addEventListener('click', runServerDbTest);
  if (btnModalTestSupabase) btnModalTestSupabase.addEventListener('click', runSupabaseTest);
  if (btnModalFetchData) btnModalFetchData.addEventListener('click', runServerDbTest);

  // Toast Functionality
  function showToast(msg) {
    const toast = document.getElementById('toast-notice');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
  }

  // 11. Subtle Ambient Gold Particle & Sparkle Canvas
  initParticleCanvas();
  initButterflyCanvas();

  // 12. Initialize Professional Join & Scroll Animations
  initScrollReveal();
  triggerScrollReveal(); // Reveal elements already in viewport
  initButtonRipples();
  init3DTilt();
  initConfettiSystem();
});

// ==========================================================================
// Scroll Reveal Observer (Smooth Staggered Entrance)
// ==========================================================================
let scrollRevealObserver = null;

function getScrollRevealObserver() {
  if (scrollRevealObserver) return scrollRevealObserver;

  scrollRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  return scrollRevealObserver;
}

function observeRevealElements(root) {
  const observer = getScrollRevealObserver();
  const targets = [];

  if (root && root.nodeType === 1) {
    if (root.classList && root.classList.contains('reveal-on-scroll')) targets.push(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('.reveal-on-scroll').forEach(el => targets.push(el));
    }
  } else {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => targets.push(el));
  }

  targets.forEach(el => observer.observe(el));
}

function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  if (!elements.length) return;
  observeRevealElements(document);
}

function triggerScrollReveal() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  const windowHeight = window.innerHeight;
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= windowHeight * 0.9) {
      el.classList.add('is-revealed');
    }
  });
}

// ==========================================================================
// Interactive Button Ripples
// ==========================================================================
function initButtonRipples() {
  document.querySelectorAll('.ripple-effect').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple-wave');

      const existingRipple = this.querySelector('.ripple-wave');
      if (existingRipple) existingRipple.remove();

      this.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });
}

// ==========================================================================
// 3D Tilt Micro-interactions on Cards
// ==========================================================================
function init3DTilt() {
  const tiltCards = document.querySelectorAll('.couple-portrait-wrap, .guest-personal-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const tiltX = (y / (rect.height / 2)) * -7;
      const tiltY = (x / (rect.width / 2)) * 7;
      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      card.style.transition = 'transform 0.5s ease';
    });
  });
}

// ==========================================================================
// Grand Celebratory Confetti & Golden Blossom Cannon
// ==========================================================================
let confettiCanvas, confettiCtx, activeConfetti = [];

function initConfettiSystem() {
  confettiCanvas = document.getElementById('confetti-canvas');
  if (!confettiCanvas) return;
  confettiCtx = confettiCanvas.getContext('2d');

  function resize() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function renderConfetti() {
    if (activeConfetti.length > 0) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      for (let i = activeConfetti.length - 1; i >= 0; i--) {
        const c = activeConfetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += c.gravity;
        c.rotation += c.rotSpeed;
        c.life -= c.decay;

        if (c.life <= 0 || c.y > confettiCanvas.height + 20) {
          activeConfetti.splice(i, 1);
          continue;
        }

        confettiCtx.save();
        confettiCtx.translate(c.x, c.y);
        confettiCtx.rotate(c.rotation);
        confettiCtx.globalAlpha = c.life;
        confettiCtx.fillStyle = c.color;

        if (c.shape === 'rect') {
          confettiCtx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        } else if (c.shape === 'petal') {
          confettiCtx.beginPath();
          confettiCtx.ellipse(0, 0, c.size, c.size / 2.5, 0, 0, Math.PI * 2);
          confettiCtx.fill();
        } else {
          confettiCtx.beginPath();
          confettiCtx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
          confettiCtx.fill();
        }

        confettiCtx.restore();
      }
    } else if (confettiCtx) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    requestAnimationFrame(renderConfetti);
  }

  renderConfetti();
}

function fireCelebrationConfetti(originX, originY, count = 80) {
  if (!confettiCanvas) return;

  const colors = [
    '#ffd700', // Imperial Gold
    '#fff3b0', // Soft Gold Shimmer
    '#e5b955', // Khmer Kbach Gold
    '#ff4d6d', // Auspicious Rose
    '#ffffff', // Diamond White
    '#d4af37'  // Metallic Gold
  ];
  const shapes = ['rect', 'petal', 'circle'];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 11 + 3;
    activeConfetti.push({
      x: originX || window.innerWidth / 2,
      y: originY || window.innerHeight / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4, // initial upward burst
      gravity: 0.18,
      size: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      life: 1.0,
      decay: Math.random() * 0.012 + 0.006
    });
  }
}

function initParticleCanvas() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 16), 40);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.6 - 0.2, // float upwards like golden stardust
      opacity: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += 0.03;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }

      const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(229, 185, 85, ${currentOpacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

function createParticleBurst() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const burstParticles = [];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    burstParticles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.015,
      size: Math.random() * 3 + 1.5
    });
  }

  function animateBurst() {
    if (burstParticles.length === 0) return;

    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 220, 110, ${p.life})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd700';
      ctx.fill();
    }

    if (burstParticles.length > 0) {
      requestAnimationFrame(animateBurst);
    }
  }

  animateBurst();
}

// ==========================================================================
// Elegant Butterfly Animation System
// ==========================================================================
function initButterflyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'butterfly-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const butterflies = [];
  const butterflyCount = Math.min(Math.floor(width / 200), 6);

  // Butterfly SVG paths for different wing positions
  const butterflyShapes = {
    wingsUp: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -18, y: -12 }, { x: -14, y: 0 }, { x: -16, y: 6 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 18, y: -12 }, { x: 14, y: 0 }, { x: 16, y: 6 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    },
    wingsMid: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -22, y: -4 }, { x: -16, y: 2 }, { x: -18, y: 8 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 22, y: -4 }, { x: 16, y: 2 }, { x: 18, y: 8 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    },
    wingsDown: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -20, y: 4 }, { x: -12, y: 8 }, { x: -14, y: 12 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 20, y: 4 }, { x: 12, y: 8 }, { x: 14, y: 12 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    }
  };

  // Khmer gold color palette for butterflies
  const butterflyColors = [
    { primary: '#e5b955', secondary: '#fff3b0', accent: '#d4af37' }, // Khmer Gold
    { primary: '#ffd700', secondary: '#fff8dc', accent: '#ffec8b' }, // Imperial Gold
    { primary: '#daa520', secondary: '#f0e68c', accent: '#b8860b' }, // Goldenrod
    { primary: '#b8860b', secondary: '#e5b955', accent: '#daa520' }, // Dark Gold
  ];

  class Butterfly {
    constructor() {
      this.reset();
      this.y = Math.random() * height;
      this.wingPhase = Math.random() * Math.PI * 2;
      this.wingSpeed = 0.15 + Math.random() * 0.1;
      this.colors = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
      this.size = 0.6 + Math.random() * 0.5;
      this.flapIntensity = 0.8 + Math.random() * 0.4;
    }

    reset() {
      this.x = -30;
      this.y = Math.random() * (height * 0.8) + height * 0.1;
      this.targetY = this.y + (Math.random() - 0.5) * 100;
      this.speedX = 0.4 + Math.random() * 0.6;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.amplitude = 20 + Math.random() * 40;
      this.frequency = 0.008 + Math.random() * 0.012;
      this.phase = Math.random() * Math.PI * 2;
      this.rotation = 0;
      this.opacity = 0;
      this.fadeIn = true;
    }

    update() {
      // Horizontal movement
      this.x += this.speedX;

      // Vertical floating with sine wave
      this.phase += this.frequency;
      this.y = this.targetY + Math.sin(this.phase) * this.amplitude;

      // Gentle rotation based on vertical movement
      this.rotation = Math.sin(this.phase) * 0.15;

      // Wing flapping animation
      this.wingPhase += this.wingSpeed * this.flapIntensity;

      // Fade in when entering screen
      if (this.fadeIn) {
        this.opacity = Math.min(1, this.opacity + 0.02);
        if (this.opacity >= 1) this.fadeIn = false;
      }

      // Fade out and reset when leaving screen
      if (this.x > width + 50) {
        this.opacity -= 0.02;
        if (this.opacity <= 0) this.reset();
      }
    }

    getWingShape() {
      const phase = Math.sin(this.wingPhase);
      if (phase > 0.3) return butterflyShapes.wingsUp;
      if (phase < -0.3) return butterflyShapes.wingsDown;
      return butterflyShapes.wingsMid;
    }

    draw(ctx) {
      if (this.opacity <= 0) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.size, this.size);
      ctx.globalAlpha = this.opacity;

      const shape = this.getWingShape();

      // Draw left wing
      ctx.beginPath();
      ctx.moveTo(shape.leftWing[0].x, shape.leftWing[0].y);
      for (let i = 1; i < shape.leftWing.length; i++) {
        ctx.lineTo(shape.leftWing[i].x, shape.leftWing[i].y);
      }
      ctx.closePath();
      const leftGradient = ctx.createLinearGradient(shape.leftWing[0].x, shape.leftWing[0].y, shape.leftWing[1].x, shape.leftWing[1].y);
      leftGradient.addColorStop(0, this.colors.primary);
      leftGradient.addColorStop(0.5, this.colors.secondary);
      leftGradient.addColorStop(1, this.colors.accent);
      ctx.fillStyle = leftGradient;
      ctx.fill();
      ctx.strokeStyle = this.colors.primary;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw right wing
      ctx.beginPath();
      ctx.moveTo(shape.rightWing[0].x, shape.rightWing[0].y);
      for (let i = 1; i < shape.rightWing.length; i++) {
        ctx.lineTo(shape.rightWing[i].x, shape.rightWing[i].y);
      }
      ctx.closePath();
      const rightGradient = ctx.createLinearGradient(shape.rightWing[0].x, shape.rightWing[0].y, shape.rightWing[1].x, shape.rightWing[1].y);
      rightGradient.addColorStop(0, this.colors.primary);
      rightGradient.addColorStop(0.5, this.colors.secondary);
      rightGradient.addColorStop(1, this.colors.accent);
      ctx.fillStyle = rightGradient;
      ctx.fill();
      ctx.strokeStyle = this.colors.primary;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw body
      ctx.beginPath();
      ctx.ellipse(shape.body.x, shape.body.y, shape.body.w / 2, shape.body.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0f08';
      ctx.fill();

      // Draw antennae
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.antenna[0].x, shape.antenna[0].y);
      ctx.quadraticCurveTo(shape.antenna[1].x, shape.antenna[1].y, shape.antenna[1].x * 1.2, shape.antenna[1].y * 1.2);
      ctx.moveTo(shape.antenna[2].x, shape.antenna[2].y);
      ctx.quadraticCurveTo(shape.antenna[3].x, shape.antenna[3].y, shape.antenna[3].x * 1.2, shape.antenna[3].y * 1.2);
      ctx.stroke();

      // Add subtle sparkle on wings
      if (Math.random() < 0.05) {
        ctx.beginPath();
        ctx.arc(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          1, 0, Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Initialize butterflies
  for (let i = 0; i < butterflyCount; i++) {
    const b = new Butterfly();
    b.x = Math.random() * width; // Start at random positions
    b.opacity = 1;
    b.fadeIn = false;
    butterflies.push(b);
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    butterflies.forEach(b => {
      b.update();
      b.draw(ctx);
    });

    requestAnimationFrame(render);
  }

  render();
}


