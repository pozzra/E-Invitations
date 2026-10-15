/**
 * Background Audio Controller for Khmer E-Invitation
 * Plays authentic background music from assets/audio/bg_music.mp3
 * with soft fade-in, loop, and graceful fallback to Web Audio synthesizer.
 */

class TraditionalAudioController {
  constructor() {
    this.audioEl = null;
    this.audioCtx = null;
    this.isPlaying = false;
    this.timerId = null;
    this.noteIndex = 0;
    this.useMp3 = true;

    // Traditional Khmer pentatonic melody frequencies for fallback
    this.scale = [311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99];
    this.melodyPattern = [
      0, 2, 3, 4, 3, 2, 0,
      1, 3, 4, 5, 4, 3, 1,
      2, 4, 5, 7, 5, 4, 2,
      0, 2, 4, 3, 2, 0
    ];

    this.initAudioElement();
  }

  initAudioElement() {
    if (!this.audioEl) {
      this.audioEl = new Audio('assets/audio/bg_music.mp3');
      this.audioEl.loop = true;
      this.audioEl.preload = 'auto';
      this.audioEl.volume = 0.8;

      this.audioEl.addEventListener('error', (e) => {
        console.warn('MP3 playback issue, falling back to Web Audio synth:', e);
        this.useMp3 = false;
      });
    }
  }

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

  // Start background music (MP3 first, fallback to synth)
  startBackgroundMusic() {
    this.initAudioElement();
    this.isPlaying = true;

    if (this.useMp3 && this.audioEl) {
      // Smooth fade-in
      this.audioEl.volume = 0.05;
      const playPromise = this.audioEl.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          let vol = 0.05;
          const fadeInterval = setInterval(() => {
            if (!this.isPlaying) {
              clearInterval(fadeInterval);
              return;
            }
            vol += 0.05;
            if (vol >= 0.8) {
              vol = 0.8;
              clearInterval(fadeInterval);
            }
            this.audioEl.volume = vol;
          }, 80);
        }).catch(err => {
          console.warn('Autoplay prevented or failed, using synth fallback:', err);
          this.startSynthMusic();
        });
      }
    } else {
      this.startSynthMusic();
    }
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

    if (this.audioEl) {
      this.audioEl.pause();
    }

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
