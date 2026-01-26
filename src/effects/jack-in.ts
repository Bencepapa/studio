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

  initialX: number;
  initialY: number;
  timeOffset: number;
  charChangeRate: number;
  initialCharIndex: number;

  canvasWidth: number;
  canvasHeight: number;
  
  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.initialX = randomRange(-canvasWidth * 5, canvasWidth * 5);
    this.initialY = randomRange(-canvasHeight * 5, canvasHeight * 5);
    this.timeOffset = randomRange(0, 100);
    this.charChangeRate = randomRange(5, 15);
    this.initialCharIndex = Math.floor(Math.random() * charset.length);

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.value = '';
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    const speed = settings.speed as number;

    const cycleDuration = 1000 / (speed / 3);
    const effectiveTime = time + this.timeOffset;
    const timeInCycle = effectiveTime % cycleDuration;
    
    this.z = 1000 - (timeInCycle / cycleDuration) * 1000;

    const charIndex = (this.initialCharIndex + Math.floor(effectiveTime * this.charChangeRate)) % charset.length;
    this.value = charset.charAt(charIndex);
  }

  draw(ctx: CanvasRenderingContext2D, fov: number, hue: number) {
    // Use initial positions for perspective calculation
    const scale = fov / (fov + this.z);
    this.x = this.initialX * scale + this.canvasWidth / 2;
    this.y = this.initialY * scale + this.canvasHeight / 2;

    const opacity = mapRange(this.z, 0, 1000, 1, 0);

    // Culling for performance
    if (opacity <= 0 || scale <= 0 || this.x < 0 || this.x > this.canvasWidth || this.y < 0 || this.y > this.canvasHeight) {
      return;
    }
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    
    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${opacity})`;
    ctx.fillText(this.value, 0, 0);
    ctx.restore();
  }
}

export class JackInEffect implements VFXEffect {
  private particles: SymbolParticle[] = [];
  private settings: VFXSettings = JackInEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private fov = 300; // Constant FOV for consistent perspective
  private width = 0;
  private height = 0;

  static effectName = "Jack In";
  static defaultSettings: VFXSettings = {
    particleCount: 400,
    speed: 30, // Higher speed for more dynamic feel
    hue: 289,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    if (this.width === 0 || this.height === 0) return;

    this.settings = { ...JackInEffect.defaultSettings, ...settings };
    this.particles = [];
    const particleCount = this.settings.particleCount as number;
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new SymbolParticle(this.width, this.height));
    }
  }

  destroy() {
    this.particles = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.settings = { ...JackInEffect.defaultSettings, ...settings };
    this.particles.forEach(p => p.update(time, deltaTime, this.settings));
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.canvas) return;
    const hue = this.settings.hue as number;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Set font once for all particles. Scaling is handled by transforms.
    ctx.font = `32px "Source Code Pro", monospace`;

    this.particles.forEach(p => p.draw(ctx, this.fov, hue));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
