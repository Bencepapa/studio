import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class Hexagon {
    q: number; // col
    r: number; // row
    s: number; // secondary axis
    
    // pixel positions
    x: number = 0;
    y: number = 0;
    
    // for animation
    distanceFromCenter: number;

    constructor(q: number, r: number, s: number) {
        this.q = q;
        this.r = r;
        this.s = s;
        this.distanceFromCenter = (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2;
    }

    calculatePixelPosition(size: number, canvasWidth: number, canvasHeight: number) {
        const x = size * (3/2 * this.q);
        const y = size * (Math.sqrt(3)/2 * this.q + Math.sqrt(3) * this.r);
        this.x = x + canvasWidth / 2;
        this.y = y + canvasHeight / 2;
    }

    draw(ctx: CanvasRenderingContext2D, size: number, time: number, settings: VFXSettings) {
        const hue = settings.hue as number;
        const rippleSpeed = settings.rippleSpeed as number;

        // The animation ripples from the center outwards
        const timeDelay = this.distanceFromCenter * 0.1;
        const animTime = (time * rippleSpeed) - timeDelay;

        // Ensure animation loops over a short period, e.g., 2 seconds
        const animProgress = (animTime % 2) / 2;

        if (animProgress < 0) return; // Don't draw if it's not their time yet in the ripple

        // A pulse effect based on a sine wave
        const pulse = Math.sin(animProgress * Math.PI);
        const opacity = pulse * 0.8; 
        const lineWidth = mapRange(pulse, 0, 1, 0.5, 3);
        
        if (opacity <= 0) return;

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${opacity})`;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            // 60 degrees per corner
            const angle = (Math.PI / 180) * (60 * i);
            const x_i = this.x + size * Math.cos(angle);
            const y_i = this.y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x_i, y_i);
            } else {
                ctx.lineTo(x_i, y_i);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
}


export class ShieldEffect implements VFXEffect {
  private hexagons: Hexagon[] = [];
  private settings: VFXSettings = ShieldEffect.defaultSettings;
  private canvas: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  private currentTime = 0;

  static effectName = "Shield";
  static defaultSettings: VFXSettings = {
    hexSize: 40,
    rippleSpeed: 2,
    hue: 200,
  };

  init(canvas: HTMLCanvasElement, settings: VFXSettings) {
    this.canvas = canvas;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    if (this.width === 0 || this.height === 0) return;

    this.settings = { ...ShieldEffect.defaultSettings, ...settings };
    this.hexagons = [];
    
    const hexSize = this.settings.hexSize as number;
    // Calculate how many hexes we need to fill the screen
    const horizontalCount = Math.ceil(this.width / (hexSize * 1.5)) + 2;
    const verticalCount = Math.ceil(this.height / (hexSize * Math.sqrt(3))) + 2;
    
    // Offset to center the grid
    const qOffset = Math.floor(horizontalCount / 2);
    const rOffset = Math.floor(verticalCount / 2);

    for (let q = -qOffset; q <= qOffset; q++) {
        for (let r = -rOffset; r <= rOffset; r++) {
            const s = -q - r;
            const hex = new Hexagon(q, r, s);
            hex.calculatePixelPosition(hexSize, this.width, this.height);
            this.hexagons.push(hex);
        }
    }
  }

  destroy() {
    this.hexagons = [];
  }

  update(time: number, deltaTime: number, settings: VFXSettings) {
    this.currentTime = time;
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();

    const needsReinit = 
      settings.hexSize !== this.settings.hexSize || 
      this.width !== rect.width || 
      this.height !== rect.height;
      
    this.settings = { ...ShieldEffect.defaultSettings, ...settings };

    if (needsReinit) {
      this.init(this.canvas, this.settings);
      return;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.width || !this.height) return;
    const hexSize = this.settings.hexSize as number;
    
    ctx.lineCap = 'round';

    this.hexagons.forEach(hex => {
      // Basic culling to not draw hexes way off screen
      const dx = hex.x - (this.width / 2);
      const dy = hex.y - (this.height / 2);
      if (Math.sqrt(dx*dx + dy*dy) < Math.max(this.width, this.height)) {
          hex.draw(ctx, hexSize, this.currentTime, this.settings);
      }
    });
  }

  getSettings(): VFXSettings {
    return this.settings;
  }
}
