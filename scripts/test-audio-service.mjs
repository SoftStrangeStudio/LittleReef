import { ReefAudioService } from '../src/audio/ReefAudioService.js';

class FakeParam { setValueAtTime() {} exponentialRampToValueAtTime() {} }
class FakeNode { connect() { return this; } start() {} stop() {} }
class FakeContext {
  state = 'suspended'; currentTime = 0; destination = new FakeNode();
  resume() { this.state = 'running'; } close() { this.state = 'closed'; }
  createGain() { const node = new FakeNode(); node.gain = new FakeParam(); return node; }
  createOscillator() { const node = new FakeNode(); node.frequency = {}; node.gain = new FakeParam(); return node; }
}

const audio = new ReefAudioService({ AudioContextClass: FakeContext });
if (!audio.start()) throw new Error('AudioContext did not start');
audio.playSelection({ seed: 'fish-a' });
audio.playParent({ seed: 'fish-b' });
audio.playBreed('offspring');
audio.playReveal({ seed: 'fish-c', genome: { mutation: 'pattern:spots' } });
audio.setMuted(true);
audio.playSelection({ seed: 'muted' });
audio.setMuted(false);
audio.dispose();
console.log(JSON.stringify({ supported: audio.supported, events: audio.events }));
