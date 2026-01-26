
import { randomRange, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const japaneseWarnings = ['警告', '危険', 'エラー', '過負荷', '不明', '異常', '障害'];

class OverloadAlertBox {
    x: number;
    y: number;
    boxWidth: number = 180;
    boxHeight: number = 70;
    cornerRadius: number = 8;
    text: string;
    
    scale: number = 0;
    opacity: number = 0;

    appearTime: number;
    appearDuration: number = 0.2; // quick pop-in

    constructor(canvasWidth: number, canvasHeight: number, appearTime: number) {
        this.x = randomRange(20, canvasWidth - this.boxWidth - 20);
        this.y = randomRange(20, canvasHeight - this.boxHeight - 20);
        this.text = japaneseWarnings[Math.floor(Math.random() * japaneseWarnings.length)];
        this.appearTime = appearTime;
    }

    update(time: number) {
        const timeSinceAppear = time - this.appearTime;
        if (timeSinceAppear >= 0 && timeSinceAppear < this.appearDuration) {
            const progress = timeSinceAppear / this.appearDuration;
            this.scale = 1 - Math.pow(1 - progress, 3); // Ease-out cubic for scale
            this.opacity = progress;
        } else if (timeSinceAppear >= this.appearDuration) {
            this.scale = 1;
            this.opacity = 1;
        } else {
            this.scale = 0;
            this.opacity = 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        if (this.opacity <= 0) return;

        const hue = settings.hue as number;
        const finalOpacity = this.opacity;

        ctx.save();
        ctx.translate(this.x + this.boxWidth / 2, this.y + this.boxHeight / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-(this.x + this.boxWidth / 2), -(this.y + this.boxHeight / 2));
        
        ctx.lineJoin = 'round';
        
        // Background
        ctx.fillStyle = `hsla(${hue}, 100%, 10%, ${finalOpacity * 0.8})`;
        ctx.beginPath();
        // The `roundRect` function is not standard on all canvas contexts.
        // For broad compatibility, we draw a rounded rect manually.
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
        ctx.fill();

        // Border
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${finalOpacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Content
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${finalOpacity})`;
        ctx.textAlign = 'center';

        // Exclamation mark
        ctx.font = 'bold 40px "Space Grotesk", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', this.x + 40, this.y + this.boxHeight / 2 + 3);

        // Japanese text
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.fillText(this.text, this.x + 110, this.y + this.boxHeight / 2 + 3);

        ctx.restore();
    }
}


export class SystemOverloadEffect implements VFXEffect {
    private alertBoxes: OverloadAlertBox[] = [];
    private settings: VFXSettings = SystemOverloadEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    // Timing for alerts
    private nextAlertTime: number = 0;
    private alertInterval: number = 0;
    
    // Timing for phases
    private overloadPhaseDuration = 4.0;
    private glitchPhaseDuration = 1.5;
    private totalDuration = 0;

    // For glitch effect
    private distortionData: ImageData | null = null;

    static effectName = "System Overload";
    static defaultSettings: VFXSettings = {
        startInterval: 0.5, // seconds
        minInterval: 0.05, // seconds
        hue: 0, // Red
    };

    constructor() {
        this.totalDuration = this.overloadPhaseDuration + this.glitchPhaseDuration;
    }
    
    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...SystemOverloadEffect.defaultSettings, ...settings };
        this.alertBoxes = [];
        this.distortionData = null;
        this.alertInterval = this.settings.startInterval as number;
        this.nextAlertTime = 0;
    }

    destroy() {
        this.alertBoxes = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        this.settings = { ...SystemOverloadEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            // fall through to update logic on first frame
        }
        
        this.currentTime = time % this.totalDuration;

        // Reset if we loop
        if (this.currentTime < deltaTime) {
            this.init(this.canvas, this.settings);
        }

        if (this.currentTime < this.overloadPhaseDuration) {
            if (this.currentTime >= this.nextAlertTime) {
                this.alertBoxes.push(new OverloadAlertBox(this.width, this.height, this.currentTime));

                // Accelerate for next alert
                const progress = this.currentTime / this.overloadPhaseDuration;
                this.alertInterval = mapRange(progress, 0, 1, this.settings.startInterval as number, this.settings.minInterval as number);
                this.nextAlertTime = this.currentTime + this.alertInterval;
            }
        } else {
             // Reset next alert time for the next loop
             this.nextAlertTime = this.totalDuration + 1;
        }

        this.alertBoxes.forEach(box => box.update(this.currentTime));
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        // Draw all existing boxes
        this.alertBoxes.forEach(box => box.draw(ctx, this.settings));

        // Glitch Phase
        const glitchStartTime = this.overloadPhaseDuration;
        if (this.currentTime > glitchStartTime) {
            const progress = (this.currentTime - glitchStartTime) / this.glitchPhaseDuration;
            
            // Capture the screen on the first frame of distortion
            if (!this.distortionData) {
                this.distortionData = ctx.getImageData(0, 0, this.width, this.height);
            }

            if (this.distortionData) {
                // Clear and redraw captured image
                ctx.clearRect(0, 0, this.width, this.height);
                ctx.putImageData(this.distortionData, 0, 0);

                // Apply glitch effects
                const stripCount = 40;
                for (let i = 0; i < stripCount; i++) {
                    if (Math.random() < progress) {
                        const y = Math.random() * this.height;
                        const h = Math.random() * (this.height / 8);
                        const xOffset = (Math.random() - 0.5) * 80 * progress;
                        
                        ctx.drawImage(
                            this.canvas!,
                            0, y, this.width, h,
                            xOffset, y, this.width, h
                        );
                    }
                }
                 // color channel shift
                if (Math.random() > 0.7) {
                    const shiftX = (Math.random() - 0.5) * 20 * progress;
                    const shiftY = (Math.random() - 0.5) * 20 * progress;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.15 * progress;
                    ctx.drawImage(this.canvas!, shiftX, shiftY);
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        } else {
            // If we are not in glitch phase, distortion data should be null for the next cycle
            this.distortionData = null;
        }
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
