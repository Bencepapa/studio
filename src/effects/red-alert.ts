import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class RedAlertEffect implements VFXEffect {
    private settings: VFXSettings = RedAlertEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    static effectName = "Red Alert";
    static defaultSettings: VFXSettings = {
        pulseSpeed: 4,
        borderWidth: 20,
        hue: 0,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...RedAlertEffect.defaultSettings, ...settings };
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;

        this.settings = { ...RedAlertEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const { pulseSpeed, borderWidth, hue } = this.settings;

        // Pulse is a value from 0 to 1 based on a sine wave
        const pulse = (Math.sin(this.currentTime * (pulseSpeed as number)) + 1) / 2;
        const opacity = mapRange(pulse, 0, 1, 0.3, 0.9);

        ctx.save();
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity})`;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.7)`;
        ctx.shadowBlur = 30;

        const width = borderWidth as number;
        // Top border
        ctx.fillRect(0, 0, this.width, width);
        // Bottom border
        ctx.fillRect(0, this.height - width, this.width, width);
        // Left border
        ctx.fillRect(0, 0, width, this.height);
        // Right border
        ctx.fillRect(this.width - width, 0, width, this.height);
        
        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
