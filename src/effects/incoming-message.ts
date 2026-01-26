import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class IncomingMessageEffect implements VFXEffect {
    private settings: VFXSettings = IncomingMessageEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    // Animation timings
    private iconAppearDuration = 0.3;
    private iconHoldDuration = 0.5;
    private boxExpandDuration = 0.4;
    private contentAppearDuration = 0.5;
    private holdDuration = 5.0;
    private fadeOutDuration = 0.5;
    private totalDuration = 0;

    static effectName = "Incoming Message";
    static defaultSettings: VFXSettings = {
        avatar: '0111010001101011000101110', // A simple smiley face
        sender: 'system@kernel.net',
        subject: 'URGENT: Security Breach Detected',
        body: 'Compromise detected in sub-network 7. Immediate action required. User activity logs attached. Review and report.',
        hue: 289,
    };

    constructor() {
        this.totalDuration = this.iconAppearDuration + this.iconHoldDuration + this.boxExpandDuration + this.contentAppearDuration + this.holdDuration + this.fadeOutDuration;
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.settings = { ...IncomingMessageEffect.defaultSettings, ...settings };
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...IncomingMessageEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
        const words = text.split(' ');
        let line = '';
        let lastY = y;
      
        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, lastY);
            line = words[n] + ' ';
            lastY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, lastY);
        return lastY + lineHeight;
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const timeInCycle = performance.now() / 1000 % this.totalDuration;
        const { hue, avatar, sender, subject, body } = this.settings;

        ctx.save();

        const boxWidth = Math.min(this.width * 0.8, 600);
        const boxHeight = Math.min(this.height * 0.7, 400);
        const boxX = (this.width - boxWidth) / 2;
        const boxY = (this.height - boxHeight) / 2;
        
        // --- Animation Phases ---
        const iconAppearEnd = this.iconAppearDuration;
        const iconHoldEnd = iconAppearEnd + this.iconHoldDuration;
        const boxExpandEnd = iconHoldEnd + this.boxExpandDuration;
        const contentAppearEnd = boxExpandEnd + this.contentAppearDuration;
        const holdEnd = contentAppearEnd + this.holdDuration;
        const fadeOutEnd = holdEnd + this.fadeOutDuration;

        let iconScale = 0;
        let iconOpacity = 0;
        let boxScaleX = 0;
        let boxScaleY = 0;
        let boxOpacity = 0;
        let contentOpacity = 0;

        if (timeInCycle < iconAppearEnd) {
            const progress = timeInCycle / this.iconAppearDuration;
            iconScale = mapRange(1 - Math.pow(1 - progress, 3), 0, 1, 0, 1); // Ease-out cubic
            iconOpacity = progress;
            boxOpacity = 0;
        } else if (timeInCycle < iconHoldEnd) {
            iconScale = 1;
            iconOpacity = 1;
            const progress = (timeInCycle - iconAppearEnd) / this.iconHoldDuration;
            const wiggle = Math.sin(progress * Math.PI * 4) * 0.1;
            iconScale = 1 + wiggle;
            boxOpacity = 0;
        } else if (timeInCycle < boxExpandEnd) {
            const progress = (timeInCycle - iconHoldEnd) / this.boxExpandDuration;
            iconOpacity = 1 - progress;
            iconScale = 1 + progress * 2;
            boxScaleX = mapRange(progress, 0, 1, 0.05, 1);
            boxScaleY = mapRange(progress, 0, 1, 0.1, 1);
            boxOpacity = 1;
        } else if (timeInCycle < fadeOutEnd) {
            iconOpacity = 0;
            boxScaleX = 1;
            boxScaleY = 1;
            boxOpacity = 1;

            if (timeInCycle < contentAppearEnd) {
                const progress = (timeInCycle - boxExpandEnd) / this.contentAppearDuration;
                contentOpacity = progress;
            } else {
                contentOpacity = 1;
            }

            if (timeInCycle > holdEnd) {
                 const progress = (timeInCycle - holdEnd) / this.fadeOutDuration;
                 boxOpacity = 1 - progress;
                 contentOpacity = 1 - progress;
            }

        } else {
            // Off-screen
            return;
        }


        // --- Drawing ---
        
        ctx.fillStyle = `hsla(${hue}, 80%, 15%, ${boxOpacity * 0.9})`;
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${boxOpacity})`;
        ctx.lineWidth = 2;
        
        // Draw Message Box
        if (boxOpacity > 0) {
            ctx.save();
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(boxScaleX, boxScaleY);
            ctx.globalAlpha = boxOpacity;
            ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            ctx.restore();
        }

        // Draw Icon
        if (iconOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = iconOpacity;
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(iconScale, iconScale);
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${iconOpacity})`;
            ctx.lineWidth = 4;
            
            // Simple envelope icon path
            ctx.beginPath();
            ctx.rect(-30, -20, 60, 40);
            ctx.moveTo(-30, -20);
            ctx.lineTo(0, 5);
            ctx.lineTo(30, -20);
            ctx.stroke();

            ctx.restore();
        }

        // Draw Content
        if (contentOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = contentOpacity;
            
            // Header
            const headerY = boxY + 20;
            const avatarX = boxX + 20;
            
            // Draw Avatar
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${contentOpacity})`;
            if (typeof avatar === 'string' && avatar.length === 25) {
                const avatarGridSize = 5;
                const pixelSize = 5;
                for (let i = 0; i < avatar.length; i++) {
                    if (avatar[i] === '1') {
                        const ax = i % avatarGridSize;
                        const ay = Math.floor(i / avatarGridSize);
                        ctx.fillRect(avatarX + ax * pixelSize, headerY + ay * pixelSize, pixelSize, pixelSize);
                    }
                }
            }

            const textX = avatarX + 35;
            
            // Draw Sender
            ctx.font = '14px "Source Code Pro", monospace';
            ctx.fillStyle = `hsla(${hue}, 30%, 80%, ${contentOpacity})`;
            ctx.fillText(sender as string, textX, headerY + 10);
            
            // Draw Subject
            ctx.font = '500 16px "Space Grotesk", sans-serif';
            ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${contentOpacity})`;
            const subjectMaxWidth = boxWidth - (textX - boxX) - 20;
            const subjectY = headerY + 28;
            const subjectLineHeight = 20;
            const subjectEndY = this.wrapText(ctx, subject as string, textX, subjectY, subjectMaxWidth, subjectLineHeight);
            
            // Separator line
            const lineY = subjectEndY;
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${contentOpacity * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(boxX + 15, lineY);
            ctx.lineTo(boxX + boxWidth - 15, lineY);
            ctx.stroke();

            // Body
            const bodyY = lineY + 25;
            const bodyX = boxX + 20;
            const bodyMaxWidth = boxWidth - 40;
            ctx.font = '15px "Source Code Pro", monospace';
            ctx.fillStyle = `hsla(0, 0%, 90%, ${contentOpacity * 0.9})`;
            this.wrapText(ctx, body as string, bodyX, bodyY, bodyMaxWidth, 20);

            // Cursor
            const cursorVisible = Math.floor(performance.now() / 500) % 2 === 0;
            if (cursorVisible && timeInCycle > contentAppearEnd && timeInCycle < holdEnd) {
                const textBlocks = (body as string).split('\n');
                let totalLines = 0;
                let lastBlockLastLine = '';
                const lineHeight = 20;
            
                textBlocks.forEach(block => {
                    const words = block.split(' ');
                    let line = '';
                    let lineCountInBlock = 1;
                    for (const word of words) {
                        const testLine = line + word + ' ';
                        if (ctx.measureText(testLine).width > bodyMaxWidth && line.length > 0) {
                            line = word + ' ';
                            lineCountInBlock++;
                        } else {
                            line = testLine;
                        }
                    }
                    lastBlockLastLine = line;
                    totalLines += lineCountInBlock;
                });
            
                const lastLineWidth = ctx.measureText(lastBlockLastLine.trimEnd()).width;
                const cursorX = bodyX + lastLineWidth;
                const cursorYPosition = bodyY + (totalLines - 1) * lineHeight;
            
                ctx.fillRect(cursorX, cursorYPosition - 14, 10, 16);
            }

            ctx.restore();
        }


        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
