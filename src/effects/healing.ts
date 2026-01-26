import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class Particle {
  x: number;
  y: number;
  life: number;
  
  // Initial state for deterministic calculation
  initialX: number;
  initialY: number;
  cycleDuration: number;
  timeOffset: number;
  vx: number;
  baseVy: number;
  size: number;

  canvasWidth: number;
  canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.size = randomRange(5, 20);

    // Set initial properties for deterministic playback
    this.initialX = randomRange(0, canvasWidth);
    this.initialY = randomRange(canvasHeight, canvasHeight * 1.2);
    this.cycleDuration = randomRange(2, 6);
    this.timeOffset = randomRange(0, this.cycleDuration);
    this.vx = randomRange(-10, 10); // pixels per second
    this.baseVy = randomRange(-150, -50); // pixels per second
    
    this.x = 0;
    this.y = 0;
    this.life = 0;
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    const speed = settings.speed as number;

    const effectiveTime = time + this.timeOffset;
    const timeInCycle = effectiveTime % this.cycleDuration;

    this.life = this.cycleDuration - timeInCycle;
    
    this.x = this.initialX + this.vx * timeInCycle;
    this.y = this.initialY + this.baseVy * speed * timeInCycle;
  }

  draw(ctx: CanvasRenderingContext2D, hue: number) {
    // Cull particles that are off-screen
    if (this.y < -this.size || this.y > this.canvasHeight + this.size || this.x < -this.size || this.x > this.canvasWidth + this.size) {
      return;
    }

    const opacity = mapRange(this.life, 0, this.cycleDuration, 0, 0.7);
    const size = mapRange(this.y, 0, this.canvasHeight, this.size, this.size * 0.2);

    ctx.save();
    ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${opacity})`;
    ctx.lineWidth = Math.max(1, size / 5);
    ctx.translate(this.x, this.y);
    
    // Draw a cross
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(0, size / 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class HealingEffect implements VFXEffect {
  private particles: Particle[] = [];
  private settings: VFXSettings = HealingEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  
  static effectName = "Healing Particles";
  static defaultSettings: VFXSettings = {
    particleCount: 100,
    speed: 1.0,
    hue: 140,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    if (this.width === 0 || this.height === 0) return;

    this.settings = { ...HealingEffect.defaultSettings, ...settings };
    this.particles = [];
    const particleCount = this.settings.particleCount as number;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(this.width, this.height));
    }
  }

  destroy() {
    this.particles = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.settings = { ...HealingEffect.defaultSettings, ...settings };
    this.particles.forEach(p => p.update(time, deltaTime, this.settings));
  }

  render(ctx: CanvasRenderingContext2D) {
    const hue = this.settings.hue as number;
    this.particles.forEach(p => p.draw(ctx, hue));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
