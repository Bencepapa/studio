import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// A class for a single glitch line
class GlitchLine {
    y: number = 0;
    height: number = 0;
    color: string = 'white';
    
    canvasWidth: number;
    canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.randomize();
    }

    randomize() {
        this.y = randomRange(0, this.canvasHeight);
        this.height = randomRange(1, 10);
        const rand = Math.random();
        if (rand < 0.33) {
            this.color = 'white';
        } else if (rand < 0.66) {
            this.color = `hsla(0, 100%, 50%, ${randomRange(0.5, 1)})`; // Red
        } else {
            this.color = `hsla(200, 100%, 50%, ${randomRange(0.5, 1)})`; // Cyan
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillRect(0, this.y, this.canvasWidth, this.height);
    }
}

export class CrashEffect implements VFXEffect {
    private glitchLines: GlitchLine[] = [];
    private settings: VFXSettings = CrashEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private noiseCanvas: HTMLCanvasElement;
    private noiseGenerated = false;

    static effectName = "System Crash";
    static defaultSettings: VFXSettings = {
        glitchFrequency: 50,
        shakeIntensity: 10, // pixels
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

        this.settings = { ...CrashEffect.defaultSettings, ...settings };
        
        if (!this.noiseGenerated) {
            this.generateNoiseTexture();
            this.noiseGenerated = true;
        }

        this.glitchLines = [];
        const lineCount = this.settings.glitchFrequency as number;
        for (let i = 0; i < lineCount; i++) {
            this.glitchLines.push(new GlitchLine(this.width, this.height));
        }
    }
    
    generateNoiseTexture() {
        this.noiseCanvas.width = this.width;
        this.noiseCanvas.height = this.height;
        const noiseCtx = this.noiseCanvas.getContext('2d')!;
        const imageData = noiseCtx.createImageData(this.width, this.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() > 0.5 ? 255 : 0;
          data[i] = val;
          data[i+1] = val;
          data[i+2] = val;
          data[i+3] = randomRange(50, 100);
        }
        noiseCtx.putImageData(imageData, 0, 0);
    }

    destroy() {
        this.glitchLines = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit = 
            settings.glitchFrequency !== this.settings.glitchFrequency || 
            this.width !== rect.width || 
            this.height !== rect.height;

        this.settings = { ...CrashEffect.defaultSettings, ...settings };
        
        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        // Randomize glitch lines on every frame for a chaotic effect
        this.glitchLines.forEach(line => line.randomize());

        // Re-generate noise texture periodically for a "live static" feel
        if (Math.random() > 0.5) {
            this.generateNoiseTexture();
        }
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        ctx.save();

        const shakeIntensity = this.settings.shakeIntensity as number;
        // Screen Shake
        const shakeX = randomRange(-shakeIntensity, shakeIntensity);
        const shakeY = randomRange(-shakeIntensity, shakeIntensity);
        ctx.translate(shakeX, shakeY);

        // Background flash
        const rand = Math.random();
        if (rand < 0.1) {
            ctx.fillStyle = 'white';
        } else if (rand < 0.2) {
            ctx.fillStyle = 'red';
        } else {
            ctx.fillStyle = 'black';
        }
        ctx.fillRect(-shakeIntensity, -shakeIntensity, this.width + shakeIntensity*2, this.height + shakeIntensity*2);

        // Draw glitch lines
        this.glitchLines.forEach(line => line.draw(ctx));

        // Draw noise overlay
        ctx.globalAlpha = randomRange(0.2, 0.5);
        ctx.drawImage(this.noiseCanvas, 0, 0);
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
