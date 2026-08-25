import { sha256Hex } from '../foundation/hash.js';
export { sha256Hex };

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const saturate = (x) => clamp(x, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  if (a === b) return x < a ? 0 : 1;
  const t = saturate((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  if (a === b) return x < a ? 0 : 1;
  const t = saturate((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const fract = (x) => x - Math.floor(x);
export const mod = (x, m) => ((x % m) + m) % m;

export const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  div: (a, s) => [a[0] / s, a[1] / s, a[2] / s],
  had: (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  lenSq: (a) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]);
    return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
  },
  mix: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  min: (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
  max: (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
  reflect: (i, n) => {
    const k = 2 * (i[0] * n[0] + i[1] * n[1] + i[2] * n[2]);
    return [i[0] - k * n[0], i[1] - k * n[1], i[2] - k * n[2]];
  },
};

export const V4 = {
  mix: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)],
};

export function hexToRgb(hex) {
  const value = hex.replace('#', '');
  if (value.length !== 6) throw new Error(`Expected #RRGGBB, received ${hex}`);
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

export function srgbToLinearChannel(x) {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function linearToSrgbChannel(x) {
  const v = Math.max(0, x);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export const srgbToLinear = (c) => c.map(srgbToLinearChannel);
export const linearToSrgb = (c) => c.map(linearToSrgbChannel);

export function acesToneMap(color) {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return color.map((x) => saturate((x * (a * x + b)) / (x * (c * x + d) + e)));
}

export class SeededRandom {
  constructor(seed = 1) {
    const hash = sha256Hex(String(seed));
    this.a = Number.parseInt(hash.slice(0, 8), 16) || 0x9e3779b9;
    this.b = Number.parseInt(hash.slice(8, 16), 16) || 0x243f6a88;
    this.c = Number.parseInt(hash.slice(16, 24), 16) || 0xb7e15162;
    this.d = Number.parseInt(hash.slice(24, 32), 16) || 0xdeadbeef;
  }

  next() {
    // sfc32
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  range(min, max) {
    return lerp(min, max, this.next());
  }

  int(min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  pick(values) {
    if (!values.length) throw new Error('Cannot pick from an empty array');
    return values[Math.min(values.length - 1, Math.floor(this.next() * values.length))];
  }

  chance(probability) {
    return this.next() < probability;
  }
}

function hash2i(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function valueNoise2D(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2i(xi, yi, seed);
  const b = hash2i(xi + 1, yi, seed);
  const c = hash2i(xi, yi + 1, seed);
  const d = hash2i(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

export function fbm2D(x, y, seed = 0, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2D(x * frequency, y * frequency, seed + i * 1013) * amplitude;
    norm += amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return norm > 0 ? sum / norm : 0;
}

export function quantizeKey3(v, scale = 100000) {
  return `${Math.round(v[0] * scale)},${Math.round(v[1] * scale)},${Math.round(v[2] * scale)}`;
}
