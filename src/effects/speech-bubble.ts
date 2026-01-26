
import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class SpeechBubbleEffect implements VFXEffect {
    private settings: VFXSettings = SpeechBubbleEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    static effectName = "Speech Bubble";
    static defaultSettings: VFXSettings = {
        text: '!',
        targetX: 50, // Percentage
        targetY: 50, // Percentage
        hue: 0,
        cornerRadius: 20,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.settings = { ...SpeechBubbleEffect.defaultSettings, ...settings };
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...SpeechBubbleEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const {
            text,
            targetX: targetXPercent,
            targetY: targetYPercent,
            hue,
            cornerRadius
        } = this.settings as {
            text: string,
            targetX: number,
            targetY: number,
            hue: number,
            cornerRadius: number
        };

        // --- Calculate Bubble Size ---
        const padding = 20;
        const fontSize = 20;
        const lineHeight = fontSize * 1.25;
        ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
        
        const lines = text.split('\n');
        let maxLineWidth = 0;
        lines.forEach(line => {
            const lineWidth = ctx.measureText(line).width;
            if (lineWidth > maxLineWidth) {
                maxLineWidth = lineWidth;
            }
        });

        const bubbleWidth = maxLineWidth + padding * 2;
        const bubbleHeight = (lines.length * lineHeight) + padding * 2;

        const targetX = (targetXPercent / 100) * this.width;
        const targetY = (targetYPercent / 100) * this.height;

        // Position bubble above the target point
        const bubbleYOffset = -bubbleHeight - 20;
        let bubbleX = targetX - bubbleWidth / 2;
        let bubbleY = targetY + bubbleYOffset;
        
        // Clamp bubble position to be within canvas bounds
        bubbleX = Math.max(10, Math.min(bubbleX, this.width - bubbleWidth - 10));
        bubbleY = Math.max(10, Math.min(bubbleY, this.height - bubbleHeight - 20));


        const pointerBaseWidth = 20;
        
        ctx.save();
        
        // Bubble Colors
        ctx.fillStyle = `hsla(${hue}, 80%, 10%, 0.8)`;
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 1)`;
        ctx.lineWidth = 3;
        
        // --- Draw Bubble Path with Pointer ---
        ctx.beginPath();
        // Start top-left
        ctx.moveTo(bubbleX + cornerRadius, bubbleY);
        // Top edge
        ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
        // Top-right corner
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
        // Right edge
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
        // Bottom-right corner
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight);
        
        // Bottom edge with pointer
        let pointerCenterX = targetX;
        // Clamp pointer horizontal position to be within the bubble's width boundaries
        pointerCenterX = Math.max(bubbleX + cornerRadius + (pointerBaseWidth/2), Math.min(pointerCenterX, bubbleX + bubbleWidth - cornerRadius - (pointerBaseWidth/2)));

        ctx.lineTo(pointerCenterX + pointerBaseWidth / 2, bubbleY + bubbleHeight);
        ctx.lineTo(targetX, targetY); // Pointer tip
        ctx.lineTo(pointerCenterX - pointerBaseWidth / 2, bubbleY + bubbleHeight);

        // Continue bottom edge
        ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
        // Bottom-left corner
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
        // Left edge
        ctx.lineTo(bubbleX, bubbleY + cornerRadius);
        // Top-left corner
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        // --- Draw Text ---
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 1)`;
        ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        lines.forEach((line, index) => {
             const yPos = bubbleY + padding + (lineHeight / 2) + (index * lineHeight);
             ctx.fillText(line, bubbleX + bubbleWidth / 2, yPos);
        });
        
        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
