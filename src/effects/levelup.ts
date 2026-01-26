import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class LevelUpEffect implements VFXEffect {
    private settings: VFXSettings = LevelUpEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    // Animation timings
    private ribbonFlyInDuration = 0.4;
    private textFlyInDelay = 0.2;
    private textFlyInDuration = 0.5;
    private holdDuration = 2.0;
    private flyOutDuration = 0.4;
    private totalDuration = 0;

    // Element properties
    private ribbonX = 0;
    private ribbonY = 0;
    private ribbonOpacity = 0;

    private textX = 0;
    private textY = 0;
    private textOpacity = 0;


    static effectName = "Level Up";
    static defaultSettings: VFXSettings = {
        message: 'LEVEL UP!',
        hue: 50, // Yellow
        ribbonWidth: 400,
        ribbonHeight: 70,
    };

    constructor() {
        this.totalDuration = this.ribbonFlyInDuration + this.holdDuration + this.flyOutDuration;
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...LevelUpEffect.defaultSettings, ...settings };
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;

        this.settings = { ...LevelUpEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        const timeInCycle = time % this.totalDuration;
        
        const ribbonWidth = this.settings.ribbonWidth as number;
        const ribbonHeight = this.settings.ribbonHeight as number;

        const centerX = (this.width - ribbonWidth) / 2;
        const centerY = (this.height - ribbonHeight) / 2;
        const rightOffscreen = this.width;
        const leftOffscreen = -ribbonWidth;

        // --- Ribbon Animation ---
        const ribbonFlyInEnd = this.ribbonFlyInDuration;
        const holdStart = ribbonFlyInEnd;
        const flyOutStart = holdStart + this.holdDuration;
        const flyOutEnd = flyOutStart + this.flyOutDuration;

        if (timeInCycle < ribbonFlyInEnd) {
            // Ribbon Fly In
            const progress = timeInCycle / this.ribbonFlyInDuration;
            const easedProgress = 1 - Math.pow(1 - progress, 4); // Ease-out quart
            this.ribbonX = mapRange(easedProgress, 0, 1, rightOffscreen, centerX);
            this.ribbonY = centerY;
            this.ribbonOpacity = 1;
        } else if (timeInCycle < flyOutStart) {
            // Ribbon Hold
            this.ribbonX = centerX;
            this.ribbonY = centerY;
            this.ribbonOpacity = 1;
        } else if (timeInCycle < flyOutEnd) {
            // Ribbon Fly Out
            const progress = (timeInCycle - flyOutStart) / this.flyOutDuration;
            const easedProgress = Math.pow(progress, 4); // Ease-in quart
            this.ribbonX = mapRange(easedProgress, 0, 1, centerX, leftOffscreen);
            this.ribbonY = centerY;
            this.ribbonOpacity = 1;
        } else {
            this.ribbonOpacity = 0;
        }

        // --- Text Animation ---
        const textFlyInStart = this.textFlyInDelay;
        const textFlyInEnd = textFlyInStart + this.textFlyInDuration;
        const textHoldEnd = flyOutStart; // Text flies out with ribbon

        if (timeInCycle >= textFlyInStart && timeInCycle < textFlyInEnd) {
            // Text Fly In
            const progress = (timeInCycle - textFlyInStart) / this.textFlyInDuration;
            const easedProgress = 1 - Math.pow(1 - progress, 4); // Ease-out quart
            this.textX = mapRange(easedProgress, 0, 1, rightOffscreen + ribbonWidth / 2, this.width / 2);
            this.textY = this.height / 2;
            this.textOpacity = 1;
        } else if (timeInCycle >= textFlyInEnd && timeInCycle < textHoldEnd) {
            // Text Hold
            this.textX = this.width / 2;
            this.textY = this.height / 2;
            this.textOpacity = 1;
        } else if (timeInCycle >= textHoldEnd && timeInCycle < flyOutEnd) {
             // Text Fly Out (with ribbon)
            const progress = (timeInCycle - textHoldEnd) / this.flyOutDuration;
            const easedProgress = Math.pow(progress, 4); // Ease-in quart
            this.textX = mapRange(easedProgress, 0, 1, this.width / 2, leftOffscreen + ribbonWidth / 2);
            this.textY = this.height / 2;
            this.textOpacity = 1;
        } else {
            this.textOpacity = 0;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height || (this.ribbonOpacity <= 0 && this.textOpacity <= 0)) return;

        const hue = this.settings.hue as number;
        const ribbonWidth = this.settings.ribbonWidth as number;
        const ribbonHeight = this.settings.ribbonHeight as number;
        const message = this.settings.message as string;
        
        ctx.save();

        // Draw Ribbon
        if (this.ribbonOpacity > 0) {
            ctx.fillStyle = `hsla(${hue}, 90%, 50%, ${this.ribbonOpacity * 0.9})`;
            ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.5)`;
            ctx.shadowBlur = 20;
            ctx.fillRect(this.ribbonX, this.ribbonY, ribbonWidth, ribbonHeight);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        // Draw Text
        if (this.textOpacity > 0) {
            ctx.globalAlpha = this.textOpacity;
            ctx.font = 'bold 36px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text with slight shadow/outline for readability
            ctx.strokeStyle = `hsla(0, 0%, 0%, ${this.textOpacity * 0.5})`;
            ctx.lineWidth = 6;
            ctx.strokeText(message, this.textX, this.textY);
            
            ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${this.textOpacity})`;
            ctx.fillText(message, this.textX, this.textY);
        }
        
        ctx.restore();
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
