import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

class AlertBox {
    flyInDuration: number = 0.3;
    holdDuration: number = 2.4;
    flyOutDuration: number = 0.3;
    
    get totalDuration() {
        return this.flyInDuration + this.holdDuration + this.flyOutDuration;
    }

    boxWidth: number = 200;
    boxHeight: number = 80;
    cornerRadius: number = 10;
    
    x: number = 0;
    y: number = 0;
    opacity: number = 0;

    canvasWidth: number;
    canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    update(time: number) {
        const timeInCycle = time % this.totalDuration;

        const restingX = this.canvasWidth - this.boxWidth - 20;
        const offscreenStartY = -this.boxHeight;
        const restingY = 20;

        if (timeInCycle <= this.flyInDuration) {
            // Fly In
            const progress = timeInCycle / this.flyInDuration;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            this.x = restingX;
            this.y = mapRange(easedProgress, 0, 1, offscreenStartY, restingY);
            this.opacity = easedProgress;
        } else if (timeInCycle <= this.flyInDuration + this.holdDuration) {
            // Hold
            this.x = restingX;
            this.y = restingY;
            this.opacity = 1.0;
        } else {
            // Fly Out
            const progress = (timeInCycle - this.flyInDuration - this.holdDuration) / this.flyOutDuration;
            const easedProgress = Math.pow(progress, 3); // Ease-in cubic
            this.x = mapRange(easedProgress, 0, 1, restingX, this.canvasWidth);
            this.y = restingY;
            this.opacity = 1 - easedProgress;
        }
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const hue = settings.hue as number;
        const baseOpacity = settings.opacity as number;

        const finalOpacity = this.opacity * baseOpacity;

        if (this.x > this.canvasWidth || this.y > this.canvasHeight || this.x < -this.boxWidth || this.y < -this.boxHeight || finalOpacity <= 0) {
            return;
        }

        ctx.save();
        
        ctx.lineJoin = 'round';
        
        // Create path for rounded rectangle
        ctx.beginPath();
        ctx.moveTo(this.x + this.cornerRadius, this.y);
        ctx.lineTo(this.x + this.boxWidth - this.cornerRadius, this.y);
        ctx.quadraticCurveTo(this.x + this.boxWidth, this.y, this.x + this.boxWidth, this.y + this.cornerRadius);
        ctx.lineTo(this.x + this.boxWidth, this.y + this.boxHeight - this.cornerRadius);
        ctx.quadraticCurveTo(this.x + this.boxWidth, this.y + this.boxHeight, this.x + this.boxWidth - this.cornerRadius, this.y + this.boxHeight);
        ctx.lineTo(this.x + this.cornerRadius, this.y + this.boxHeight);
        ctx.quadraticCurveTo(this.x, this.y + this.boxHeight, this.x, this.y + this.boxHeight - this.cornerRadius);
        ctx.lineTo(this.x, this.y + this.cornerRadius);
        ctx.quadraticCurveTo(this.x, this.y, this.x + this.cornerRadius, this.y);
        ctx.closePath();
        
        // Background
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${finalOpacity * 0.2})`;
        ctx.fill();

        // Border
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${finalOpacity})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Exclamation mark
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${finalOpacity})`;
        ctx.font = 'bold 50px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', this.x + this.boxWidth / 2, this.y + this.boxHeight / 2 + 3); // Small adjustment for centering

        ctx.restore();
    }
}


export class AlertEffect implements VFXEffect {
    private alertBox: AlertBox | null = null;
    private settings: VFXSettings = AlertEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    static effectName = "Alert";
    static defaultSettings: VFXSettings = {
        hue: 50, // Yellow
        opacity: 0.9,
    };
    
    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...AlertEffect.defaultSettings, ...settings };
        this.alertBox = new AlertBox(this.width, this.height);
    }

    destroy() {
        this.alertBox = null;
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        this.settings = { ...AlertEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        this.alertBox?.update(time);
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height || !this.alertBox) return;

        this.alertBox.draw(ctx, this.settings);
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
