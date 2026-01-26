import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class Scratch {
  y: number;
  height: number;
  speed: number;
  initialY: number;
  timeOffset: number;
  canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasHeight = canvasHeight;
    this.initialY = randomRange(0, canvasHeight);
    this.height = randomRange(1, 3);
    this.speed = randomRange(50, 200); // pixels per second
    this.timeOffset = randomRange(0, 10);
    this.y = 0;
  }

  update(time: number) {
    const effectiveTime = time + this.timeOffset;
    this.y = (this.initialY + effectiveTime * this.speed) % this.canvasHeight;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, opacity: number) {
    ctx.fillStyle = `hsla(0, 100%, 50%, ${opacity * 0.5})`;
    ctx.fillRect(0, this.y, canvasWidth, this.height);
  }
}

export class DamageEffect implements VFXEffect {
  private scratches: Scratch[] = [];
  private settings: VFXSettings = DamageEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  private noiseCanvas: HTMLCanvasElement;
  private noiseGenerated = false;
  private currentTime = 0;

  static effectName = "Damage";
  static defaultSettings: VFXSettings = {
    cloudIntensity: 5,
    scratchCount: 10,
    hue: 0,
    pulseSpeed: 5,
  };

  constructor() {
    this.noiseCanvas = document.createElement('canvas');
  }

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    if (this.width === 0 || this.height === 0) return;

    this.settings = { ...DamageEffect.defaultSettings, ...settings };
    this.scratches = [];
    const scratchCount = this.settings.scratchCount as number;
    for (let i = 0; i < scratchCount; i++) {
        this.scratches.push(new Scratch(this.width, this.height));
    }
    
    // Generate noise texture only once
    if (!this.noiseGenerated) {
      this.generateNoiseTexture();
      this.noiseGenerated = true;
    }
  }

  generateNoiseTexture() {
    this.noiseCanvas.width = 128;
    this.noiseCanvas.height = 128;
    const noiseCtx = this.noiseCanvas.getContext('2d')!;
    const imageData = noiseCtx.createImageData(128, 128);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const val = Math.random() * 255;
      imageData.data[i] = val;
      imageData.data[i+1] = val;
      imageData.data[i+2] = val;
      imageData.data[i+3] = 255;
    }
    noiseCtx.putImageData(imageData, 0, 0);
  }

  destroy() {
      this.scratches = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.currentTime = time;
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();

    const needsReinit = 
      settings.scratchCount !== this.settings.scratchCount || 
      this.width !== rect.width || 
      this.height !== rect.height;

    this.settings = { ...DamageEffect.defaultSettings, ...settings };
    
    if (needsReinit) {
      this.init(this.canvas, this.settings);
      return;
    }

    this.scratches.forEach(s => s.update(time));
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.width || !this.height) return;
    
    const hue = this.settings.hue as number;
    const cloudIntensity = this.settings.cloudIntensity as number;
    const pulseSpeed = this.settings.pulseSpeed as number;

    const pulse = (Math.sin(this.currentTime * pulseSpeed) + 1) / 2; // 0 to 1
    const pulseFactor = mapRange(pulse, 0, 1, 0.6, 1); // pulse between 0.6 and 1


    // Create a gradient for the base color
    const gradient = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7);
    gradient.addColorStop(0, `hsla(${hue}, 90%, 55%, ${0.2 * pulseFactor})`);
    gradient.addColorStop(1, `hsla(${hue}, 90%, 45%, ${0.6 * pulseFactor})`);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw cloudy effect using noise texture
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = mapRange(cloudIntensity, 0, 20, 0, 0.8) * pulseFactor;
    ctx.filter = `blur(${cloudIntensity}px)`;
    ctx.drawImage(this.noiseCanvas, 0, 0, this.width, this.height);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';


    // Draw scratches
    const scratchOpacity = mapRange(cloudIntensity, 0, 20, 0.1, 0.8) * pulseFactor;
    this.scratches.forEach(s => s.draw(ctx, this.width, scratchOpacity));
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
