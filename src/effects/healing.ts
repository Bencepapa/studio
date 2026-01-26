import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class Particle {
  x: number;
  y: number;
  z: number;
  life: number;
  initialLife: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number, speed: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = randomRange(0, canvasWidth);
    this.y = randomRange(canvasHeight * 0.8, canvasHeight * 1.2);
    this.z = randomRange(0, 5);
    this.initialLife = randomRange(2, 6);
    this.life = this.initialLife;
    this.vx = randomRange(-0.5, 0.5);
    this.vy = randomRange(-1.5 * speed, -0.5 * speed);
    this.vz = 0;
    this.size = mapRange(this.z, 0, 5, 5, 20);
  }

  update(deltaTime: number) {
    this.life -= deltaTime;

    this.x += this.vx * deltaTime * 50;
    this.y += this.vy * deltaTime * 50;

    if (this.y < -this.size || this.life <= 0) {
      this.reset();
    }
  }
  
  reset() {
      this.x = randomRange(0, this.canvasWidth);
      this.y = randomRange(this.canvasHeight, this.canvasHeight * 1.2);
      this.life = this.initialLife;
  }

  draw(ctx: CanvasRenderingContext2D, hue: number) {
    const opacity = mapRange(this.life, 0, this.initialLife, 0, 0.7);
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
  
  static effectName = "Healing Particles";
  static defaultSettings: VFXSettings = {
    particleCount: 100,
    speed: 1.0,
    hue: 140,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    this.settings = { ...HealingEffect.defaultSettings, ...settings };
    this.particles = [];
    const particleCount = this.settings.particleCount as number;
    const speed = this.settings.speed as number;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(canvas.width, canvas.height, speed));
    }
  }

  destroy() {
    this.particles = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.settings = { ...HealingEffect.defaultSettings, ...settings };
    const speed = this.settings.speed as number;
    
    this.particles.forEach((p, i) => {
      // Ensure particle properties are updated if settings change
      if(p.vy > -0.5 * speed || p.vy < -1.5 * speed) {
          p.vy = randomRange(-1.5 * speed, -0.5 * speed);
      }
      p.update(deltaTime);
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    const hue = this.settings.hue as number;
    this.particles.forEach(p => p.draw(ctx, hue));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
