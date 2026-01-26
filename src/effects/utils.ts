export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) return outMin;
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// mulberry32
export function seededRandom(seed: number) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
