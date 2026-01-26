import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

interface LayoutWord {
    text: string;
    x: number;
    animation: 'none' | 'wobble' | 'wave' | 'shake';
}

export class SpeechBubbleEffect implements VFXEffect {
    private settings: VFXSettings = SpeechBubbleEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;

    // Animation state
    private currentTime = 0;
    private readonly appearDuration = 0.3;
    private readonly disappearDuration = 0.3;

    static effectName = "Speech Bubble";
    static defaultSettings: VFXSettings = {
        text: 'I\'m quite ^surprised^ to see you!\nThis is all ~wobble~ and *shaky*!',
        targetX: 50, // Percentage
        targetY: 50, // Percentage
        hue: 0,
        cornerRadius: 10,
        displayDuration: 4.4,
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
        this.currentTime = time;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...SpeechBubbleEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    private calculateLayout(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
        const lines: { words: LayoutWord[], width: number }[] = [];
        const allWords = text.replace(/\n/g, ' \n ').split(' ');
        let currentLine: LayoutWord[] = [];
        let currentX = 0;
        const spaceWidth = ctx.measureText(' ').width;
    
        allWords.forEach(word => {
            if (word === '\n') {
                lines.push({ words: currentLine, width: currentX > 0 ? currentX - spaceWidth : 0 });
                currentLine = [];
                currentX = 0;
                return;
            }
            if (word === '') return;

            // Measure the visual width of the word (e.g., "*shaky*!" -> "shaky!") for wrapping logic
            const wordWidth = ctx.measureText(word.replace(/[~^*]/g, '')).width;
            if (currentLine.length > 0 && currentX + wordWidth > maxWidth) {
                lines.push({ words: currentLine, width: currentX > 0 ? currentX - spaceWidth : 0 });
                currentLine = [];
                currentX = 0;
            }

            // Now, break down the word and add its parts to the line.
            const match = word.match(/^([~^*])(.+?)\1([.,!?;:]*)$/);
            if (match && match[2]) {
                 const marker = match[1];
                 const content = match[2];
                 const punctuation = match[3];

                 let animation: LayoutWord['animation'] = 'none';
                 if (marker === '~') animation = 'wobble';
                 else if (marker === '^') animation = 'wave';
                 else if (marker === '*') animation = 'shake';

                 const contentWidth = ctx.measureText(content).width;
                 currentLine.push({ text: content, animation, x: currentX });
                 currentX += contentWidth;
                 
                 if (punctuation) {
                     const puncWidth = ctx.measureText(punctuation).width;
                     currentLine.push({ text: punctuation, animation: 'none', x: currentX });
                     currentX += puncWidth;
                 }
            } else {
                currentLine.push({ text: word, animation: 'none', x: currentX });
                currentX += ctx.measureText(word).width;
            }
            currentX += spaceWidth;
        });
    
        if (currentLine.length > 0) {
            lines.push({ words: currentLine, width: currentX > 0 ? currentX - spaceWidth : 0 });
        }
        
        let maxLineWidth = 0;
        lines.forEach(line => {
            if (line.width > maxLineWidth) maxLineWidth = line.width;
        });
    
        return { lines, maxWidth: maxLineWidth };
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const {
            text,
            targetX: targetXPercent,
            targetY: targetYPercent,
            hue,
            cornerRadius,
            displayDuration,
        } = this.settings as {
            text: string,
            targetX: number,
            targetY: number,
            hue: number,
            cornerRadius: number,
            displayDuration: number
        };
        
        const totalDuration = this.appearDuration + displayDuration + this.disappearDuration;

        // --- 1. Animation State ---
        const timeInCycle = this.currentTime % totalDuration;
        const appearEnd = this.appearDuration;
        const holdEnd = appearEnd + displayDuration;

        let bubbleScale = 0;
        let bubbleOpacity = 0;

        if (timeInCycle < appearEnd) {
            const progress = timeInCycle / this.appearDuration;
            bubbleScale = mapRange(1 - Math.pow(1 - progress, 3), 0, 1, 0.8, 1);
            bubbleOpacity = progress;
        } else if (timeInCycle < holdEnd) {
            bubbleScale = 1;
            bubbleOpacity = 1;
        } else {
            const progress = (timeInCycle - holdEnd) / this.disappearDuration;
            bubbleScale = mapRange(progress, 0, 1, 1, 0.8);
            bubbleOpacity = 1 - progress;
        }
        
        if (bubbleOpacity <= 0.01) return;

        // --- 2. Calculate Text Layout & Bubble Size ---
        const paddingX = 20;
        const paddingY = 15;
        const fontSize = 18;
        const lineHeight = fontSize * 1.2;
        ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
        const maxTextWidth = this.width * 0.6;
        
        const layout = this.calculateLayout(ctx, text, maxTextWidth);
        const bubbleWidth = layout.maxWidth + paddingX * 2;
        const bubbleHeight = (layout.lines.length * lineHeight) + paddingY * 2;

        // --- 3. Position Bubble ---
        const targetX = (targetXPercent / 100) * this.width;
        const targetY = (targetYPercent / 100) * this.height;

        const bubbleYOffset = -bubbleHeight - 20;
        let bubbleX = targetX - bubbleWidth / 2;
        let bubbleY = targetY + bubbleYOffset;
        
        bubbleX = Math.max(10, Math.min(bubbleX, this.width - bubbleWidth - 10));
        bubbleY = Math.max(10, Math.min(bubbleY, this.height - bubbleHeight - 20));

        // --- 4. Draw Bubble ---
        ctx.save();
        ctx.globalAlpha = bubbleOpacity;

        const scaleOriginX = bubbleX + bubbleWidth / 2;
        const scaleOriginY = bubbleY + bubbleHeight;
        ctx.translate(scaleOriginX, scaleOriginY);
        ctx.scale(bubbleScale, bubbleScale);
        ctx.translate(-scaleOriginX, -scaleOriginY);

        ctx.fillStyle = `hsla(${hue}, 80%, 10%, 0.8)`;
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 1)`;
        ctx.lineWidth = 3;
        
        const pointerBaseWidth = 20;
        ctx.beginPath();
        ctx.moveTo(bubbleX + cornerRadius, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight);
        
        let pointerCenterX = targetX;
        pointerCenterX = Math.max(bubbleX + cornerRadius + (pointerBaseWidth / 2), Math.min(pointerCenterX, bubbleX + bubbleWidth - cornerRadius - (pointerBaseWidth / 2)));
        
        ctx.lineTo(pointerCenterX + pointerBaseWidth / 2, bubbleY + bubbleHeight);
        ctx.lineTo(targetX, targetY);
        ctx.lineTo(pointerCenterX - pointerBaseWidth / 2, bubbleY + bubbleHeight);

        ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
        ctx.lineTo(bubbleX, bubbleY + cornerRadius);
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        // --- 5. Draw Animated Text ---
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 1)`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        layout.lines.forEach((line, lineIndex) => {
            const lineY = bubbleY + paddingY + (lineHeight / 2) + (lineIndex * lineHeight);
            line.words.forEach(word => {
                ctx.save();
                let wordX = bubbleX + paddingX + word.x;
                let wordY = lineY;
    
                switch(word.animation) {
                    case 'wave':
                        wordY += Math.sin(this.currentTime * 8 + (word.x / 10)) * 3;
                        break;
                    case 'shake':
                        wordX += (Math.random() - 0.5) * 2;
                        wordY += (Math.random() - 0.5) * 2;
                        break;
                    case 'wobble':
                        let charX = wordX;
                        for (let i = 0; i < word.text.length; i++) {
                            const char = word.text[i];
                            const charWidth = ctx.measureText(char).width;
                            ctx.save();
                            ctx.translate(charX + charWidth / 2, wordY);
                            const rotation = Math.sin(this.currentTime * 20 + i * 0.5) * 0.25;
                            ctx.rotate(rotation);
                            ctx.fillText(char, -charWidth / 2, 0);
                            ctx.restore();
                            charX += charWidth;
                        }
                        // Since we drew the word char by char, we skip the final fillText.
                        ctx.restore();
                        return; // Go to next word
                }
                
                ctx.fillText(word.text, wordX, wordY);
                ctx.restore();
            });
        });

        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
