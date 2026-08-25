function createImage(width, height, fill = [0, 0, 0, 255]) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) throw new Error(`Invalid image size ${width}x${height}`);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const k = i * 4;
    data[k] = fill[0]; data[k + 1] = fill[1]; data[k + 2] = fill[2]; data[k + 3] = fill[3] ?? 255;
  }
  return { width, height, data };
}

import { V3, clamp, fract, smoothstep, fbm2D, valueNoise2D, lerp, saturate } from './math.js';

function toByte(value) {
  return Math.round(clamp(value) * 255);
}

function setRgba(image, x, y, color, alpha = 1) {
  const index = (y * image.width + x) * 4;
  image.data[index] = toByte(color[0]);
  image.data[index + 1] = toByte(color[1]);
  image.data[index + 2] = toByte(color[2]);
  image.data[index + 3] = toByte(alpha);
}

function mix3(a, b, t) {
  return V3.mix(a, b, saturate(t));
}

function gaussian(x, center, width) {
  const value = (x - center) / width;
  return Math.exp(-value * value);
}

function cellularSpot(u, v, seed) {
  const scaleX = 17;
  const scaleY = 11;
  const x = u * scaleX;
  const y = v * scaleY;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let minDistance = Infinity;
  let activation = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const cx = xi + ox;
      const cy = yi + oy;
      const jitterX = valueNoise2D(cx * 1.71, cy * 2.03, seed + 17);
      const jitterY = valueNoise2D(cx * 2.19, cy * 1.37, seed + 31);
      const dx = x - (cx + jitterX);
      const dy = y - (cy + jitterY);
      const distance = Math.hypot(dx, dy);
      if (distance < minDistance) {
        minDistance = distance;
        activation = valueNoise2D(cx * 0.87, cy * 1.23, seed + 71);
      }
    }
  }
  const radius = lerp(0.20, 0.42, activation);
  return 1 - smoothstep(radius * 0.82, radius, minDistance);
}

function patternMask(definition, u, v, theta, noise) {
  const warpedU = u + (noise - 0.5) * 0.025 + Math.sin(theta * 2 + u * 4) * 0.007;
  switch (definition.patternType) {
    case 'spots': {
      const spot = cellularSpot(warpedU, v, definition.seedNumber);
      const sideMask = 0.25 + 0.75 * Math.pow(Math.abs(Math.sin(theta)), 0.55);
      return spot * sideMask;
    }
    case 'mottled': {
      const low = fbm2D(warpedU * 7.2, v * 5.4, definition.seedNumber + 201, 5);
      const high = fbm2D(warpedU * 20, v * 14, definition.seedNumber + 419, 3);
      return smoothstep(0.48, 0.69, low * 0.78 + high * 0.22);
    }
    case 'saddles': {
      const top = Math.pow(Math.max(0, Math.cos(theta)), 0.6);
      const bands = Math.max(
        gaussian(warpedU, 0.40, 0.085),
        gaussian(warpedU, 0.62, 0.075),
        gaussian(warpedU, 0.79, 0.055),
      );
      return bands * top;
    }
    case 'bands':
    default: {
      const bands = Math.max(
        gaussian(warpedU, 0.42, 0.052),
        gaussian(warpedU, 0.585, 0.047),
        gaussian(warpedU, 0.735, 0.038),
      );
      const sideMask = 0.52 + 0.48 * Math.pow(Math.abs(Math.sin(theta)), 0.35);
      return smoothstep(0.12, 0.86, bands) * sideMask;
    }
  }
}

function scaleHeight(u, v, seed) {
  const scaleU = 58;
  const scaleV = 32;
  const row = Math.floor(v * scaleV);
  const cu = u * scaleU + (row & 1 ? 0.5 : 0);
  const cv = v * scaleV;
  const fu = fract(cu) - 0.5;
  const fv = fract(cv) - 0.5;
  const radius = Math.hypot(fu * 1.12, fv * 0.92);
  const ridge = Math.exp(-Math.pow((radius - 0.42) / 0.055, 2));
  const center = Math.max(0, 1 - radius / 0.48);
  const micro = (fbm2D(u * 120, v * 80, seed + 991, 3) - 0.5) * 0.18;
  return ridge * 0.82 + center * 0.12 + micro;
}

export function generateBodyTextures(definition, width = 1024, height = 512) {
  const albedo = createImage(width, height, [0, 0, 0, 255]);
  const normal = createImage(width, height, [128, 128, 255, 255]);
  const metallicRoughness = createImage(width, height, [255, 128, 0, 255]);
  const ao = createImage(width, height, [255, 255, 255, 255]);
  const heightField = new Float32Array(width * height);
  const baseField = new Float32Array(width * height * 3);
  const roughField = new Float32Array(width * height);
  const aoField = new Float32Array(width * height);

  const palette = definition.palette;
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const theta = v * Math.PI * 2;
    const vertical = Math.cos(theta); // +1 dorsal, -1 belly
    const side = Math.abs(Math.sin(theta));
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const index = y * width + x;
      const noise = fbm2D(u * 6.5, v * 5.5, definition.seedNumber + 11, 5);
      const microNoise = fbm2D(u * 52, v * 35, definition.seedNumber + 37, 3);
      const scales = scaleHeight(u, v, definition.seedNumber);
      heightField[index] = scales;

      const dorsal = Math.pow(Math.max(0, vertical), 0.75);
      const belly = Math.pow(Math.max(0, -vertical), 0.7);
      const headGlow = smoothstep(0.66, 0.92, u) * side;
      const peduncleDark = 1 - smoothstep(0.06, 0.23, u);

      let color = mix3(palette.baseDeep, palette.base, 0.55 + 0.30 * side);
      color = mix3(color, palette.dorsal, dorsal * 0.60);
      color = mix3(color, palette.belly, belly * 0.72);
      color = mix3(color, palette.face, headGlow * 0.16);
      color = mix3(color, palette.baseDeep, peduncleDark * 0.22);

      const pattern = patternMask(definition, u, v, theta, noise);
      const brokenPattern = pattern * (0.82 + 0.18 * microNoise);
      color = mix3(color, palette.accent, brokenPattern * definition.patternStrength);

      const edgeDark = saturate((scales - 0.30) * 0.12);
      const centerSheen = saturate((1 - Math.abs(scales - 0.13) * 3) * 0.04);
      color = color.map((channel) => clamp(channel * (1 - edgeDark) + centerSheen));
      const chromatophore = (microNoise - 0.5) * (0.018 + definition.surface.variation * 0.052);
      color = color.map((channel, channelIndex) => clamp(channel + chromatophore * (channelIndex === 2 ? 1.15 : 0.8)));

      baseField[index * 3] = color[0];
      baseField[index * 3 + 1] = color[1];
      baseField[index * 3 + 2] = color[2];
      roughField[index] = clamp(0.26 + dorsal * 0.09 + edgeDark * 0.35 + (1 - side) * 0.05 + (noise - 0.5) * 0.04, 0.18, 0.62);
      aoField[index] = clamp(0.91 + side * 0.07 - edgeDark * 0.08 - peduncleDark * 0.025, 0.78, 1);
    }
  }

  const normalStrength = 0.34;
  for (let y = 0; y < height; y += 1) {
    const ym = (y - 1 + height) % height;
    const yp = (y + 1) % height;
    for (let x = 0; x < width; x += 1) {
      const xm = Math.max(0, x - 1);
      const xp = Math.min(width - 1, x + 1);
      const index = y * width + x;
      const dhdu = (heightField[y * width + xp] - heightField[y * width + xm]) * normalStrength;
      const dhdv = (heightField[yp * width + x] - heightField[ym * width + x]) * normalStrength;
      const n = V3.norm([-dhdu, -dhdv, 1]);
      setRgba(normal, x, y, [n[0] * 0.5 + 0.5, n[1] * 0.5 + 0.5, n[2] * 0.5 + 0.5], 1);
      setRgba(albedo, x, y, [baseField[index * 3], baseField[index * 3 + 1], baseField[index * 3 + 2]], 1);
      const metallic = definition.surface.iridescence > 0.35 ? 0.055 : 0.018;
      setRgba(metallicRoughness, x, y, [1, roughField[index], metallic], 1);
      setRgba(ao, x, y, [aoField[index], aoField[index], aoField[index]], 1);
    }
  }

  return { albedo, normal, metallicRoughness, ao };
}

export function generateFinTextures(definition, width = 512, height = 512) {
  const albedo = createImage(width, height, [0, 0, 0, 0]);
  const normal = createImage(width, height, [128, 128, 255, 255]);
  const metallicRoughness = createImage(width, height, [255, 128, 0, 255]);
  const ao = createImage(width, height, [255, 255, 255, 255]);
  const palette = definition.palette;
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width; // root -> trailing edge
      const noise = fbm2D(u * (7 + definition.surface.variation * 3), v * (10 + definition.surface.variation * 5), definition.seedNumber + 811, 4);
      const rayPhase = Math.abs(Math.sin((v * 17 + u * 1.8) * Math.PI));
      const ray = Math.pow(1 - rayPhase, 8);
      const edgeFade = 1 - smoothstep(0.70, 1.0, u);
      const spanFade = smoothstep(0, 0.08, v) * (1 - smoothstep(0.92, 1, v));
      const alpha = clamp((0.30 + edgeFade * 0.62) * spanFade * (0.90 + noise * 0.10), 0, 0.94);
      let color = mix3(palette.finDeep, palette.fin, 0.42 + edgeFade * 0.45);
      color = mix3(color, palette.accent, ray * 0.17 * (1 - u));
      color = color.map((channel) => clamp(channel * (0.86 + noise * 0.18) + ray * 0.055));
      setRgba(albedo, x, y, color, alpha);
      const ripple = Math.sin((u * 8.5 + v * 2.3) * Math.PI) * 0.09 * edgeFade;
      const nr = V3.norm([ripple, (ray - 0.35) * 0.16, 1]);
      setRgba(normal, x, y, [nr[0] * 0.5 + 0.5, nr[1] * 0.5 + 0.5, nr[2] * 0.5 + 0.5], 1);
      const roughness = clamp(0.31 + (1 - edgeFade) * 0.10 + noise * 0.06, 0.24, 0.58);
      setRgba(metallicRoughness, x, y, [1, roughness, 0], 1);
      const occlusion = clamp(0.90 + edgeFade * 0.08 - ray * 0.03, 0.82, 1);
      setRgba(ao, x, y, [occlusion, occlusion, occlusion], 1);
    }
  }
  return { albedo, normal, metallicRoughness, ao };
}

export function generateEyeTexture(definition, width = 256, height = 256) {
  const image = createImage(width, height, [0, 0, 0, 0]);
  const center = [(width - 1) / 2, (height - 1) / 2];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - center[0]) / (width * 0.5);
      const dy = (y - center[1]) / (height * 0.5);
      const radius = Math.hypot(dx, dy);
      if (radius > 1) continue;
      const angle = Math.atan2(dy, dx);
      const radialNoise = fbm2D(dx * 7 + 4, dy * 7 + 4, definition.seedNumber + 1201, 4);
      const rays = Math.pow(Math.abs(Math.sin(angle * 26 + radialNoise * 3)), 8);
      const pupilRadius = definition.eyeProfile === 'dark' ? 0.42 : 0.34;
      let color;
      if (radius < pupilRadius) {
        color = [0.004, 0.009, 0.012];
      } else {
        const irisT = clamp((radius - pupilRadius) / (1 - pupilRadius));
        color = mix3(definition.palette.irisInner, definition.palette.irisOuter, irisT);
        color = color.map((channel) => clamp(channel + rays * 0.16 * (1 - irisT) + (radialNoise - 0.5) * 0.07));
      }
      const limbal = smoothstep(0.80, 1.0, radius);
      color = mix3(color, [0.01, 0.025, 0.032], limbal * 0.72);
      setRgba(image, x, y, color, 1);
    }
  }
  return image;
}
