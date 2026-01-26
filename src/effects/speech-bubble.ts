
import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class SpeechBubbleEffect implements VFXEffect {
    private settings: VFXSettings = SpeechBubbleEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    static effectName = "Speech Bubble";
    static defaultSettings: VFXSettings = {
        character: '!',
        targetX: 50, // Percentage
        targetY: 50, // Percentage
        hue: 0,
        bubbleWidth: 60,
        bubbleHeight: 60,
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
            character,
            targetX: targetXPercent,
            targetY: targetYPercent,
            hue,
            bubbleWidth,
            bubbleHeight,
            cornerRadius
        } = this.settings as {
            character: string,
            targetX: number,
            targetY: number,
            hue: number,
            bubbleWidth: number,
            bubbleHeight: number,
            cornerRadius: number
        };

        const targetX = (targetXPercent / 100) * this.width;
        const targetY = (targetYPercent / 100) * this.height;

        // Position bubble above the target point
        const bubbleYOffset = -bubbleHeight - 20;
        let bubbleX = targetX - bubbleWidth / 2;
        let bubbleY = targetY + bubbleYOffset;
        
        // Clamp bubble position to be within canvas bounds
        bubbleX = Math.max(0, Math.min(bubbleX, this.width - bubbleWidth));
        bubbleY = Math.max(0, Math.min(bubbleY, this.height - bubbleHeight - 20));


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
        const pointerCenterX = targetX;
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

        // --- Draw Character ---
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 1)`;
        ctx.font = `bold ${bubbleHeight * 0.6}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(character.charAt(0), bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 3);
        
        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
