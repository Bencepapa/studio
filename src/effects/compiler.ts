
import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const codeCharset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:",./<>?`~';

class CodeChar {
    x: number;
    y: number;
    char: string;
    appearTime: number;

    constructor(x: number, y: number, appearTime: number) {
        this.x = x;
        this.y = y;
        this.appearTime = appearTime;
        this.char = codeCharset.charAt(Math.floor(Math.random() * codeCharset.length));
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings) {
        if (time >= this.appearTime) {
            const hue = settings.hue as number;
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, 1)`;
            ctx.fillText(this.char, this.x, this.y);
        }
    }
}

class CompilerBox {
    boxX: number = 0;
    boxY: number = 0;
    boxWidth: number = 250;
    boxHeight: number = 70;
    opacity: number = 0;

    canvasWidth: number;
    canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.boxX = (this.canvasWidth - this.boxWidth) / 2;
        this.boxY = (this.canvasHeight - this.boxHeight) / 2;
    }

    draw(ctx: CanvasRenderingContext2D, time: number, phase: string, settings: VFXSettings) {
        const { compilingMessage, doneMessage, blinkDoneMessage, hue } = settings;
        const baseColor = `hsla(${hue}, 100%, 70%, ${this.opacity})`;
        const bgColor = `hsla(${hue}, 100%, 10%, ${this.opacity * 0.8})`;

        if (this.opacity <= 0) return;
        
        ctx.save();
        
        // Draw box
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.fillRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
        ctx.strokeRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
        
        // Draw text
        ctx.fillStyle = baseColor;
        ctx.font = '16px "Source Code Pro", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const cursorVisible = Math.floor(time * 2) % 2 === 0; // Blink cursor
        let textToShow = '';
        let textWidth = 0;

        if (phase === 'compiling') {
            textToShow = compilingMessage as string;
        } else if (phase === 'done') {
            textToShow = doneMessage as string;
            const shouldBlink = blinkDoneMessage && cursorVisible;
            if (shouldBlink) {
                 ctx.globalAlpha = 0;
            }
        }
        
        ctx.fillText(textToShow, this.boxX + 15, this.boxY + 15);
        ctx.globalAlpha = this.opacity;
        
        textWidth = ctx.measureText(textToShow).width;
        
        if (cursorVisible && (phase === 'compiling' || (phase === 'done' && !blinkDoneMessage))) {
            ctx.fillRect(this.boxX + 15 + textWidth + 5, this.boxY + 15, 10, 16);
        }

        ctx.restore();
    }
}


export class CompilerEffect implements VFXEffect {
    private codeChars: CodeChar[] = [];
    private compilerBox: CompilerBox | null = null;
    private settings: VFXSettings = CompilerEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private phase: string = 'writing';
    private currentTime = 0;

    // Phase durations
    private writingDuration = 3;
    private boxAppearDuration = 0.5;
    private compilingDuration = 1.5;
    private doneDuration = 5;

    static effectName = "Compiler";
    static defaultSettings: VFXSettings = {
        codeLineCount: 20,
        typingSpeed: 500, // characters per second
        compilingMessage: "Compiling...",
        doneMessage: "ACCESS GRANTED",
        blinkDoneMessage: true,
        keepCharsOnTop: false,
        hue: 128,
    };
    
    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CompilerEffect.defaultSettings, ...settings };
        
        this.compilerBox = new CompilerBox(this.width, this.height);
        this.codeChars = [];

        const typingSpeed = this.settings.typingSpeed as number; // chars per second
        const codeLineCount = this.settings.codeLineCount as number;
        
        const charWidth = 9.6; // approx width for 16px monospace
        const lineHeight = 20;

        const charsPerLine = Math.floor((this.width * 0.8) / charWidth);
        const startX = this.width * 0.1;
        const startY = (this.height - codeLineCount * lineHeight) / 2;

        let charIndex = 0;
        for (let i = 0; i < codeLineCount; i++) {
            for (let j = 0; j < charsPerLine; j++) {
                const x = startX + j * charWidth;
                const y = startY + i * lineHeight;
                const appearTime = charIndex / typingSpeed;
                if (appearTime > this.writingDuration) {
                    break;
                }
                this.codeChars.push(new CodeChar(x, y, appearTime));
                charIndex++;
            }
        }
    }

    destroy() {
        this.codeChars = [];
        this.compilerBox = null;
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        
        const needsReinit = this.width !== rect.width || this.height !== rect.height || this.settings.codeLineCount !== settings.codeLineCount || this.settings.typingSpeed !== settings.typingSpeed;
        this.settings = { ...CompilerEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        const totalDuration = this.writingDuration + this.boxAppearDuration + this.compilingDuration + this.doneDuration;
        const timeInCycle = time % totalDuration;
        this.currentTime = timeInCycle;
        
        const boxStartTime = this.writingDuration;
        const compileStartTime = boxStartTime + this.boxAppearDuration;
        const doneStartTime = compileStartTime + this.compilingDuration;
        const endTime = doneStartTime + this.doneDuration;
        
        if (timeInCycle < boxStartTime) {
            this.phase = 'writing';
            this.compilerBox!.opacity = 0;
        } else if (timeInCycle < compileStartTime) {
            this.phase = 'boxAppear';
            const progress = (timeInCycle - boxStartTime) / this.boxAppearDuration;
            this.compilerBox!.opacity = progress;
        } else if (timeInCycle < doneStartTime) {
            this.phase = 'compiling';
            this.compilerBox!.opacity = 1;
        } else if (timeInCycle < endTime) {
            this.phase = 'done';
            this.compilerBox!.opacity = 1;
        } else {
            this.phase = 'end';
            this.compilerBox!.opacity = 0;
        }
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height || !this.compilerBox) return;

        ctx.font = '16px "Source Code Pro", monospace';
        ctx.textAlign = 'left';
        
        const { keepCharsOnTop } = this.settings;

        if (this.phase === 'writing' || keepCharsOnTop) {
             this.codeChars.forEach(c => c.draw(ctx, this.currentTime, this.settings));
        }
       
        this.compilerBox.draw(ctx, this.currentTime, this.phase, this.settings);
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
