
import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

export class C64StartupEffect implements VFXEffect {
    private settings: VFXSettings = C64StartupEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private distortionData: ImageData | null = null;

    // Animation timings
    private fadeInDuration = 0.3;
    private typingDuration = 2.5;
    private holdDuration = 2.0;
    private distortionDuration = 1.0;
    private totalDuration = 0;

    static effectName = "C64 Startup";
    static defaultSettings: VFXSettings = {
        line1: 'ＶＦＸシステム', // VFX System
        line2: '６４ＫＢ ＲＡＭ － 準備完了', // 64KB RAM - READY
        primaryHue: 195,
        backgroundHue: 230,
    };

    constructor() {
        this.totalDuration = this.fadeInDuration + this.typingDuration + this.holdDuration + this.distortionDuration;
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...C64StartupEffect.defaultSettings, ...settings };
        this.distortionData = null; // reset distortion data
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...C64StartupEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const timeInCycle = this.currentTime;
        const { line1, line2, primaryHue, backgroundHue } = this.settings;
        
        const borderColor = `hsl(${primaryHue as number}, 53%, 79%)`;
        const backgroundColor = `hsl(${backgroundHue as number}, 35%, 25%)`;
        const textColor = `hsl(${primaryHue as number}, 53%, 79%)`;
        
        const textLines = [line1 as string, line2 as string, "READY."];

        const typingStart = this.fadeInDuration;
        const holdStart = typingStart + this.typingDuration;
        const distortionStart = holdStart + this.holdDuration;

        let overallOpacity = 1.0;
        
        if (timeInCycle < this.fadeInDuration) {
            overallOpacity = mapRange(timeInCycle, 0, this.fadeInDuration, 0, 1);
        } else if (timeInCycle > distortionStart) {
             const progress = (timeInCycle - distortionStart) / this.distortionDuration;
             if (progress > 0.5) {
                 overallOpacity = mapRange(progress, 0.5, 1, 1, 0);
             }
        }
        
        ctx.save();
        ctx.globalAlpha = overallOpacity;

        // Draw background and border
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);

        const borderWidth = this.width * 0.1;
        const borderHeight = this.height * 0.1;
        ctx.fillStyle = borderColor;
        // top
        ctx.fillRect(0, 0, this.width, borderHeight);
        // bottom
        ctx.fillRect(0, this.height - borderHeight, this.width, borderHeight);
        // left
        ctx.fillRect(0, 0, borderWidth, this.height);
        // right
        ctx.fillRect(this.width - borderWidth, 0, borderWidth, this.height);

        // Draw Text
        ctx.fillStyle = textColor;
        ctx.font = `bold ${Math.min(this.width, this.height) / 20}px "Source Code Pro", monospace`;
        ctx.textBaseline = 'top';

        const textX = borderWidth + 20;
        const textY = borderHeight + 20;
        const lineHeight = Math.min(this.width, this.height) / 20 * 1.5;

        const totalCharsToType = textLines.join('').length;
        const charsToDraw = Math.floor(mapRange(timeInCycle, typingStart, holdStart, 0, totalCharsToType + 1));
        
        let charsDrawn = 0;
        let cursorX = textX;
        let cursorY = textY;

        for(let i = 0; i < textLines.length; i++) {
            const line = textLines[i];
            
            if (charsDrawn >= charsToDraw) break;

            const remainingCharsInLine = Math.min(line.length, charsToDraw - charsDrawn);
            const lineToDraw = line.substring(0, remainingCharsInLine);
            ctx.fillText(lineToDraw, textX, textY + i * lineHeight);
            
            if (charsDrawn + line.length > charsToDraw) { // Is this the line the cursor is on?
                cursorX = textX + ctx.measureText(lineToDraw).width;
                cursorY = textY + i * lineHeight;
            } else { // This line is fully typed
                 if (i + 1 < textLines.length) { // If there's a next line, move cursor there
                    cursorX = textX;
                    cursorY = textY + (i + 1) * lineHeight;
                 } else { // This is the last line and it's fully typed
                    cursorX = textX;
                    cursorY = textY + (i + 1) * lineHeight;
                 }
            }
            charsDrawn += line.length;
        }

        // Blinking Cursor
        if(timeInCycle > typingStart && timeInCycle < distortionStart) {
            const cursorVisible = Math.floor(this.currentTime * 2) % 2 === 0;
            if (cursorVisible) {
                ctx.fillText('█', cursorX, cursorY);
            }
        }
        
        ctx.restore();


        // Distortion Phase
        if (timeInCycle > distortionStart) {
            const progress = (timeInCycle - distortionStart) / this.distortionDuration;
            
            // Capture the screen on the first frame of distortion
            if (!this.distortionData) {
                this.distortionData = ctx.getImageData(0, 0, this.width, this.height);
            }

            if (this.distortionData) {
                // Clear and redraw captured image
                ctx.clearRect(0, 0, this.width, this.height);
                ctx.putImageData(this.distortionData, 0, 0);

                // Apply glitch effects
                const stripCount = 30;
                for (let i = 0; i < stripCount; i++) {
                    if (Math.random() > (1 - progress)) {
                        const y = Math.random() * this.height;
                        const h = Math.random() * (this.height / 10);
                        const xOffset = (Math.random() - 0.5) * 50 * progress;
                        
                        ctx.drawImage(
                            this.canvas!,
                            0, y, this.width, h,
                            xOffset, y, this.width, h
                        );
                    }
                }
                 // color channel shift
                if (Math.random() > 0.8) {
                    const shiftX = (Math.random() - 0.5) * 15 * progress;
                    const shiftY = (Math.random() - 0.5) * 15 * progress;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.2 * progress;
                    ctx.drawImage(this.canvas!, shiftX, shiftY);
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        }
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
