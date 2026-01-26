
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class TransitionRibbon {
    y: number;
    height: number;
    delay: number;
    flyFrom: 'left' | 'right';
    
    constructor(index: number, totalRibbons: number, canvasHeight: number, totalDuration: number) {
        this.height = canvasHeight / totalRibbons + 2;
        this.y = index * (canvasHeight / totalRibbons);
        this.delay = seededRandom(index) * (totalDuration / 2) * 0.6;
        this.flyFrom = seededRandom(index + 1) > 0.5 ? 'left' : 'right';
    }

    draw(ctx: CanvasRenderingContext2D, time: number, totalDuration: number, settings: VFXSettings) {
        const { hue } = settings;
        const halfDuration = totalDuration / 2;
        const canvasWidth = ctx.canvas.width;

        const timeWithDelay = time - this.delay;
        if (timeWithDelay < 0) return;

        const flyInDuration = halfDuration - this.delay;
        if (flyInDuration <= 0) return;

        let x;
        let progress;
        
        if (timeWithDelay < flyInDuration) { // Flying in
            progress = timeWithDelay / flyInDuration;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const startX = this.flyFrom === 'left' ? -canvasWidth : canvasWidth;
            x = mapRange(easedProgress, 0, 1, startX, 0);
        } else { // Flying out
            progress = (timeWithDelay - flyInDuration) / (totalDuration - flyInDuration);
            const easedProgress = Math.pow(progress, 3); // easeInCubic
            const endX = this.flyFrom === 'left' ? canvasWidth : -canvasWidth;
            x = mapRange(easedProgress, 0, 1, 0, endX);
        }

        ctx.fillStyle = `hsl(${hue}, 80%, 15%)`;
        ctx.fillRect(x, this.y, canvasWidth, this.height);
    }
}


export class RibbonTransitionEffect implements VFXEffect {
    private ribbons: TransitionRibbon[] = [];
    private settings: VFXSettings = RibbonTransitionEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 1.5;

    static effectName = "Ribbon Transition";
    static defaultSettings: VFXSettings = {
        ribbonCount: 20,
        hue: 289,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...RibbonTransitionEffect.defaultSettings, ...settings };
        
        this.ribbons = [];
        const ribbonCount = this.settings.ribbonCount as number;
        for (let i = 0; i < ribbonCount; i++) {
            this.ribbons.push(new TransitionRibbon(i, ribbonCount, this.height, this.totalDuration));
        }
    }

    destroy() {
        this.ribbons = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.ribbonCount !== settings.ribbonCount;

        this.settings = { ...RibbonTransitionEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        this.ribbons.forEach(ribbon => {
            ribbon.draw(ctx, this.currentTime, this.totalDuration, this.settings);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
