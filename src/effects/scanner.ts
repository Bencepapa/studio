import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class ScanLine {
    y: number;
    initialY: number;
    speed: number;
    height: number;
    opacity: number;
    timeOffset: number;
    canvasHeight: number;

    constructor(canvasHeight: number) {
        this.canvasHeight = canvasHeight;
        this.initialY = randomRange(0, canvasHeight);
        this.speed = randomRange(100, 300); // pixels per second
        this.height = randomRange(1, 4);
        this.opacity = randomRange(0.2, 0.8);
        this.timeOffset = randomRange(0, 20);
        this.y = 0;
    }

    update(time: number, speedMultiplier: number) {
        const effectiveTime = time + this.timeOffset;
        const loopDistance = this.canvasHeight + this.height;
        this.y = (this.initialY + effectiveTime * this.speed * speedMultiplier) % loopDistance;
    }

    draw(ctx: CanvasRenderingContext2D, canvasWidth: number, hue: number) {
        if (this.y > this.canvasHeight) return;
        
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${this.opacity})`;
        ctx.fillRect(0, this.y, canvasWidth, this.height);
    }
}


export class ScannerEffect implements VFXEffect {
    private lines: ScanLine[] = [];
    private settings: VFXSettings = ScannerEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    static effectName = "Scanner";
    static defaultSettings: VFXSettings = {
        lineCount: 50,
        scanSpeed: 1,
        hue: 180, // Cyan
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...ScannerEffect.defaultSettings, ...settings };
        
        this.lines = [];
        const lineCount = this.settings.lineCount as number;
        for (let i = 0; i < lineCount; i++) {
            this.lines.push(new ScanLine(this.height));
        }
    }

    destroy() {
        this.lines = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.lineCount !== settings.lineCount;

        this.settings = { ...ScannerEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        const scanSpeed = this.settings.scanSpeed as number;
        this.lines.forEach(line => line.update(this.currentTime, scanSpeed));
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;
        
        const hue = this.settings.hue as number;

        this.lines.forEach(line => {
            line.draw(ctx, this.width, hue);
        });
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
