
import { mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';

export class GameMenuEffect implements VFXEffect {
    private settings: VFXSettings = GameMenuEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    private menuItems: string[] = [
        'CHARACTER',
        'CYBERDECK',
        'CONTRACT',
        'SHOP',
        'PROJECTS',
        'REST',
        'MATRIX',
        'OPTIONS'
    ];
    private selectedIndex = 0;

    static effectName = "Game Menu";
    static defaultSettings: VFXSettings = {
        mainHue: 30, // Orange
        accentHue: 180, // Cyan
        scanlineOpacity: 0.08,
        textSkew: -0.1,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...GameMenuEffect.defaultSettings, ...settings };
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...GameMenuEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }

        const cycleDuration = 8; // 1 second per item
        this.selectedIndex = Math.floor((time % cycleDuration) / (cycleDuration / this.menuItems.length));
    }
    
    drawScanlines(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = `hsla(0, 0%, 0%, ${this.settings.scanlineOpacity})`;
        for(let y=0; y < this.height; y += 4) {
            ctx.fillRect(0, y, this.width, 2);
        }
        ctx.restore();
    }
    
    drawHorizontalLine(ctx: CanvasRenderingContext2D, y: number, opacity: number) {
        const mainHue = this.settings.mainHue as number;
        ctx.fillStyle = `hsla(${mainHue}, 90%, 60%, ${opacity * 0.5})`;
        ctx.fillRect(0, y, this.width, 2);
        ctx.fillStyle = `hsla(${mainHue}, 100%, 80%, ${opacity})`;
        ctx.fillRect(0, y+2, this.width, 1);
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const { mainHue, accentHue, textSkew } = this.settings;

        // Background
        ctx.fillStyle = `hsl(${mainHue}, 40%, 5%)`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Scanlines
        this.drawScanlines(ctx);
        
        // --- UI Elements ---
        ctx.textBaseline = 'top';
        const fontSize = Math.min(this.width, this.height) / 25;
        ctx.font = `bold ${fontSize}px "Source Code Pro", monospace`;
        const textColor = `hsl(${mainHue}, 90%, 50%)`;
        const selectedColor = `hsl(${accentHue}, 80%, 70%)`;
        
        ctx.save();
        if (textSkew !== 0) {
            // Apply skew from the center of the menu text block
            const menuBlockYCenter = this.height / 2;
            const skewOffset = menuBlockYCenter * (textSkew as number);
            ctx.transform(1, 0, textSkew as number, 1, -skewOffset, 0);
        }

        // --- Header ---
        const headerY = this.height * 0.15;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('M A I N - M E N U', this.width / 2, headerY - fontSize * 0.5);
        this.drawHorizontalLine(ctx, headerY + fontSize, 1);
        
        // --- Menu items ---
        ctx.textAlign = 'left';
        let currentY = this.height * 0.3;
        const lineHeight = fontSize * 1.8;
        const textX = this.width * 0.25;

        this.menuItems.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            ctx.fillStyle = isSelected ? selectedColor : textColor;
            
            let displayItem = item;
            if (isSelected) {
                // Add a blinking selector
                const selector = Math.sin(this.currentTime * 10) > 0 ? '>' : ' ';
                displayItem = `${selector} ${item}`;
                ctx.shadowColor = selectedColor;
                ctx.shadowBlur = 15;
            }

            ctx.fillText(displayItem, textX, currentY);
            ctx.shadowBlur = 0;

            currentY += lineHeight;
        });
        
        ctx.restore(); // Restore from text skew

        // --- Decorative side elements ---
        ctx.save()
        const sideElementY = this.height * 0.3;
        const sideElementX = this.width * 0.8;
        ctx.font = `bold ${fontSize * 0.8}px "Source Code Pro", monospace`;
        ctx.fillStyle = `hsla(${mainHue}, 60%, 30%, 0.5)`;
        for(let i = 0; i < 12; i++) {
            const char = katakana[Math.floor(this.currentTime*2 + i*i) % katakana.length];
            ctx.fillText(char, sideElementX, sideElementY + i * fontSize * 1.2);
        }
        ctx.restore();


        // --- Glitch effect ---
        if(Math.random() < 0.05) {
            const y = Math.random() * this.height;
            const h = Math.random() * 20 + 1;
            const xOffset = (Math.random() - 0.5) * 50;
            ctx.drawImage(ctx.canvas, 0, y, this.width, h, xOffset, y, this.width, h);
        }
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
