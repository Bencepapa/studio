import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const charset = katakana + latin + nums;

class SymbolParticle {
  x: number;
  y: number;
  z: number;
  value: string;

  canvasWidth: number;
  canvasHeight: number;
  speed: number;
  
  constructor(canvasWidth: number, canvasHeight: number, speed: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.speed = speed;
    this.value = charset.charAt(Math.floor(Math.random() * charset.length));
    this.z = randomRange(100, 1000);
    this.x = randomRange(-this.canvasWidth, this.canvasWidth);
    this.y = randomRange(-this.canvasHeight, this.canvasHeight);
  }

  reset() {
    this.z = randomRange(500, 1000);
    this.x = randomRange(-this.canvasWidth, this.canvasWidth);
    this.y = randomRange(-this.canvasHeight, this.canvasHeight);
    this.value = charset.charAt(Math.floor(Math.random() * charset.length));
  }

  update(deltaTime: number) {
    this.z -= this.speed * deltaTime * 10;
    if (this.z < 1) {
      this.reset();
    }
  }

  draw(ctx: CanvasRenderingContext2D, fov: number, hue: number) {
    const scale = fov / (fov + this.z);
    const sx = this.x * scale + this.canvasWidth / 2;
    const sy = this.y * scale + this.canvasHeight / 2;

    if (sx < 0 || sx > this.canvasWidth || sy < 0 || sy > this.canvasHeight) {
      return;
    }

    const size = mapRange(this.z, 0, 1000, 20, 1);
    const opacity = mapRange(this.z, 0, 1000, 1, 0);

    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${opacity})`;
    ctx.font = `${size}px "Source Code Pro", monospace`;
    ctx.fillText(this.value, sx, sy);
  }
}

export class JackInEffect implements VFXEffect {
  private particles: SymbolParticle[] = [];
  private settings: VFXSettings = JackInEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private fov = 250;

  static effectName = "Jack In";
  static defaultSettings: VFXSettings = {
    particleCount: 200,
    speed: 10,
    hue: 289,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.fov = width * 0.8;

    if (width === 0 || height === 0) return;

    this.settings = { ...JackInEffect.defaultSettings, ...settings };
    this.particles = [];
    const particleCount = this.settings.particleCount as number;
    const speed = this.settings.speed as number;

    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new SymbolParticle(width, height, speed));
    }
  }

  destroy() {
    this.particles = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.settings = { ...JackInEffect.defaultSettings, ...settings };
    const speed = this.settings.speed as number;

    this.particles.forEach(p => {
        if(p.speed !== speed) {
            p.speed = speed;
        }
        p.update(deltaTime);
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.canvas) return;
    const hue = this.settings.hue as number;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    this.particles.forEach(p => p.draw(ctx, this.fov, hue));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
