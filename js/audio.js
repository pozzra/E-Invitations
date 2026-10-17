/**
 * Background Audio Controller for Khmer E-Invitation
 * Plays a random track from the invitation music playlist (MP3/audio URL or
 * YouTube) with soft fade-in, automatic advance to the next random track, and
 * graceful fallback to a Web Audio synthesizer when nothing can be played.
 */

class TraditionalAudioController {
  constructor() {
    this.audioEl = null;
    this.audioCtx = null;
    this.isPlaying = false;
    this.timerId = null;
    this.noteIndex = 0;
    this.useMp3 = true;

    // Music playlist: [{ type: 'file'|'youtube', src, title }]
    this.playlist = [];
    this.currentTrack = null;
    this._fadeTimer = null;

    // YouTube IFrame player state
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytContainer = null;
    this.ytPendingVideoId = null;

    // Traditional Khmer pentatonic melody frequencies for fallback
    this.scale = [311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99];
    this.melodyPattern = [
      0, 2, 3, 4, 3, 2, 0,
      1, 3, 4, 5, 4, 3, 1,
      2, 4, 5, 7, 5, 4, 2,
      0, 2, 4, 3, 2, 0
    ];

    this.initAudioElement();
    this.initYouTubeAPI();
  }

  // ==========================================================================
  // Playlist management
  // ==========================================================================
  setPlaylist(tracks) {
    const list = Array.isArray(tracks) ? tracks : [];
    this.playlist = list
      .map(t => {
        if (typeof t === 'string') {
          return { type: this.isYouTube(t) ? 'youtube' : 'file', src: t, title: t };
        }
        if (t && t.src) {
          return {
            type: t.type || (this.isYouTube(t.src) ? 'youtube' : 'file'),
            src: t.src,
            title: t.title || t.src
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  isYouTube(src) {
    return /^(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)/i.test(src || '');
  }

  extractYouTubeId(src) {
    if (!src) return null;
    const match = src.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  pickRandomTrack() {
    if (!this.playlist.length) {
      return { type: 'file', src: 'assets/audio/bg_music.mp3', title: 'Default Background Music' };
    }
    if (this.playlist.length === 1) return this.playlist[0];
    let choice;
    let guard = 0;
    do {
      choice = this.playlist[Math.floor(Math.random() * this.playlist.length)];
      guard++;
    } while (this.currentTrack && choice.src === this.currentTrack.src && guard < 20);
    return choice;
  }

  // ==========================================================================
  // File / audio element playback
  // ==========================================================================
  initAudioElement() {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.preload = 'auto';
      this.audioEl.volume = 0.8;

      this.audioEl.addEventListener('ended', () => {
        if (this.isPlaying) this.playRandomTrack();
      });

      this.audioEl.addEventListener('error', () => {
        console.warn('Audio track failed to load:', this.audioEl && this.audioEl.src);
      });
    }
  }

  fadeIn() {
    if (this._fadeTimer) clearInterval(this._fadeTimer);
    let vol = 0.05;
    this._fadeTimer = setInterval(() => {
      if (!this.isPlaying || !this.audioEl) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        return;
      }
      vol += 0.05;
      if (vol >= 0.8) {
        vol = 0.8;
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
      }
      this.audioEl.volume = vol;
    }, 80);
  }

  playFile(src) {
    this.stopYouTube();
    this.initAudioElement();
    this.audioEl.src = src;
    this.audioEl.loop = false;
    this.audioEl.volume = 0.05;

    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.fadeIn();
      }).catch(err => {
        console.warn('Audio playback prevented or failed, using synth fallback:', err);
        this.startSynthMusic();
      });
    }
  }

  stopFile() {
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch (e) {}
    }
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
  }

  // ==========================================================================
  // YouTube IFrame playback
  // ==========================================================================
  initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.ytReady = true;
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      this.ytReady = true;
      if (this.ytPendingVideoId) {
        const vid = this.ytPendingVideoId;
        this.ytPendingVideoId = null;
        this.createYouTubePlayer(vid);
      }
    };
    if (!document.getElementById('youtube-iframe-api-script')) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  }

  playYouTube(src) {
    const vid = this.extractYouTubeId(src);
    if (!vid) {
      this.startSynthMusic();
      return;
    }
    this.stopFile();

    if (!this.ytReady) {
      this.ytPendingVideoId = vid;
      return;
    }
    if (this.ytPlayer && this.ytPlayer.loadVideoById) {
      this.ytPlayer.loadVideoById(vid);
      this.ytPlayer.setVolume(70);
      this.ytPlayer.playVideo();
    } else {
      this.createYouTubePlayer(vid);
    }
  }

  createYouTubePlayer(vid) {
    if (!this.ytContainer) {
      this.ytContainer = document.createElement('div');
      this.ytContainer.id = 'yt-bg-audio-host';
      this.ytContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
      const inner = document.createElement('div');
      inner.id = 'yt-bg-audio-player';
      this.ytContainer.appendChild(inner);
      document.body.appendChild(this.ytContainer);
    }
    this.ytPlayer = new window.YT.Player('yt-bg-audio-player', {
      height: '1',
      width: '1',
      videoId: vid,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(70);
          event.target.playVideo();
        },
        onStateChange: (event) => {
          if (window.YT && event.data === window.YT.PlayerState.ENDED && this.isPlaying) {
            this.playRandomTrack();
          }
        },
        onError: () => {
          console.warn('YouTube playback error, using synth fallback.');
          this.startSynthMusic();
        }
      }
    });
  }

  stopYouTube() {
    if (this.ytPlayer && this.ytPlayer.stopVideo) {
      try { this.ytPlayer.stopVideo(); } catch (e) {}
    }
  }

  // ==========================================================================
  // Public controls
  // ==========================================================================
  startBackgroundMusic() {
    this.isPlaying = true;
    this.playRandomTrack();
  }

  playRandomTrack() {
    if (!this.isPlaying) return;
    const track = this.pickRandomTrack();
    this.currentTrack = track;
    if (track.type === 'youtube') {
      this.playYouTube(track.src);
    } else {
      this.playFile(track.src);
    }
  }

  // ==========================================================================
  // Synthesizer fallback (Web Audio)
  // ==========================================================================
  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Soft acoustic chime / harp note
  playChime(freq, timeOffset = 0, duration = 2.2, volume = 0.08) {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime + timeOffset;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.01, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  // Royal seal break sound effect
  playSealBreakSound() {
    this.initContext();
    [261.63, 392.00, 523.25, 783.99].forEach((freq, idx) => {
      this.playChime(freq, idx * 0.08, 3.0, 0.12);
    });
  }

  startSynthMusic() {
    this.initContext();
    this.noteIndex = 0;

    const stepMelody = () => {
      if (!this.isPlaying) return;

      const scaleIdx = this.melodyPattern[this.noteIndex % this.melodyPattern.length];
      const freq = this.scale[scaleIdx];

      this.playChime(freq, 0, 2.5, 0.07);

      if (this.noteIndex % 4 === 0) {
        const harmonyFreq = this.scale[(scaleIdx + 2) % this.scale.length];
        this.playChime(harmonyFreq, 0.15, 3.0, 0.04);
      }

      this.noteIndex++;
      const delays = [850, 750, 950, 1100, 700];
      const nextDelay = delays[this.noteIndex % delays.length];

      this.timerId = setTimeout(stepMelody, nextDelay);
    };

    stepMelody();
  }

  stopBackgroundMusic() {
    this.isPlaying = false;
    this.stopFile();
    this.stopYouTube();

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  toggleMusic() {
    if (this.isPlaying) {
      this.stopBackgroundMusic();
      return false;
    } else {
      this.startBackgroundMusic();
      return true;
    }
  }
}

window.traditionalAudio = new TraditionalAudioController();
