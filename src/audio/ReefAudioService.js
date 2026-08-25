const tones = {
  selection: { frequency: 520, duration: 0.11, volume: 0.035, type: 'sine' },
  parent: { frequency: 660, duration: 0.13, volume: 0.04, type: 'triangle' },
  breeding: { frequency: 330, duration: 0.28, volume: 0.045, type: 'sawtooth' },
  reveal: { frequency: 740, duration: 0.34, volume: 0.055, type: 'sine' },
  rare: { frequency: 980, duration: 0.42, volume: 0.06, type: 'triangle' },
  collision: { frequency: 180, duration: 0.035, volume: 0.012, type: 'sine' }
};

const seedOffset = (seed) => {
  let value = 0;
  for (const char of String(seed ?? 'reef')) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return (value % 90) - 45;
};

export class ReefAudioService {
  constructor({ AudioContextClass = globalThis.window?.AudioContext ?? globalThis.AudioContext } = {}) {
    this.AudioContextClass = AudioContextClass;
    this.context = null;
    this.ambient = null;
    this.muted = false;
    this.events = [];
    this.lastCollisionAt = 0;
  }

  get supported() { return Boolean(this.AudioContextClass); }

  attachUserGesture(target) {
    if (!target?.addEventListener) return;
    const start = () => this.start();
    target.addEventListener('pointerdown', start, { once: true, passive: true });
    target.addEventListener('keydown', start, { once: true, passive: true });
  }

  start() {
    if (!this.supported) return false;
    if (!this.context) this.context = new this.AudioContextClass();
    if (this.context.state === 'suspended') this.context.resume?.();
    if (!this.ambient && !this.muted) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 74;
      gain.gain.value = 0.008;
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      this.ambient = { oscillator, gain };
      this.events.push('ambient-start');
    }
    return true;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.ambient?.gain) this.ambient.gain.gain.value = this.muted ? 0 : 0.008;
    this.events.push(this.muted ? 'muted' : 'unmuted');
  }

  play(name, seed) {
    if (this.muted || !this.start()) return false;
    const tone = tones[name];
    if (!tone) return false;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.value = tone.frequency + seedOffset(seed);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tone.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.duration + 0.02);
    this.events.push(name);
    return true;
  }

  playSelection(fish) { return this.play('selection', fish?.seed); }
  playParent(fish) { return this.play('parent', fish?.seed); }
  playBreed(seed) { return this.play('breeding', seed); }
  playReveal(fish) { return this.play(fish?.genome?.mutation ? 'rare' : 'reveal', fish?.seed); }
  playCollision() {
    const now = Date.now();
    if (now - this.lastCollisionAt < 120) return false;
    this.lastCollisionAt = now;
    return this.play('collision', now);
  }

  dispose() {
    this.ambient?.oscillator.stop?.();
    this.ambient = null;
    this.context?.close?.();
    this.context = null;
    this.events.push('disposed');
  }
}
