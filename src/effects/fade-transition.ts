
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const colorPalette = [
    [255, 0, 255], [0, 255, 255], [255, 255, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255],
    [255, 128, 0], [255, 0, 128], [128, 255, 0], [0, 255, 128], [128, 0, 255], [0, 128, 255], [255, 128, 128],
    [128, 255, 128], [128, 128, 255]
];
const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const charset = katakana + latin + nums;

class FadeCell {
    x: number;
    y: number;
    width: number;
    height: number;
    delay: number;
    color: number[];
    glyph: string;
    glyphColor: number[];

    constructor(x: number, y: number, width: number, height: number, totalDuration: number, gridWidth: number, gridHeight: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // Use a seed based on grid position for deterministic randomness
        const seed = (x / width) * gridWidth + (y / height);
        // Random delay up to half the total transition time to ensure all cells can participate
        this.delay = seededRandom(seed) * (totalDuration / 2);
        this.color = colorPalette[Math.floor(seededRandom(seed + 1) * colorPalette.length)];
        this.glyph = charset.charAt(Math.floor(seededRandom(seed + 2) * charset.length));
        this.glyphColor = colorPalette[Math.floor(seededRandom(seed + 3) * colorPalette.length)];
    }

    draw(ctx: CanvasRenderingContext2D, time: number, totalDuration: number, settings: VFXSettings) {
        const halfDuration = totalDuration / 2;

        const timeWithDelay = time - this.delay;
        if (timeWithDelay < 0) return;

        let opacity = 0;
        const fadeInDuration = halfDuration - this.delay;
        if (fadeInDuration <=0) return;

        if (timeWithDelay < fadeInDuration) {
            // Fade in
            const progress = timeWithDelay / fadeInDuration;
            opacity = Math.min(1, progress);
        } else {
            // Fade out
            const fadeOutDuration = halfDuration;
            const progress = (timeWithDelay - fadeInDuration) / fadeOutDuration;
            opacity = 1 - Math.min(1, progress);
        }

        opacity = Math.max(0, opacity);
        if (opacity <= 0) return;
        
        const { useRandomColors, drawGlyphs } = settings;

        let r = 255, g = 255, b = 255;
        if (useRandomColors) {
            [r, g, b] = this.color;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (drawGlyphs) {
            ctx.font = `bold ${this.height * 0.8}px "Source Code Pro", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let glyphR, glyphG, glyphB;

            if (useRandomColors) {
                [glyphR, glyphG, glyphB] = this.glyphColor;
            } else {
                // If not using random colors, background is white. Use black for glyph.
                [glyphR, glyphG, glyphB] = [0, 0, 0];
            }

            const glyphOpacity = opacity * 0.85;
            ctx.fillStyle = `rgba(${glyphR}, ${glyphG}, ${glyphB}, ${glyphOpacity})`;
            ctx.fillText(this.glyph, this.x + this.width / 2, this.y + this.height / 2);
        }
    }
}

export class FadeTransitionEffect implements VFXEffect {
    private cells: FadeCell[] = [];
    private settings: VFXSettings = FadeTransitionEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 2.0;

    static effectName = "Fade Transition";
    static defaultSettings: VFXSettings = {
        gridDivisions: 20,
        useRandomColors: false,
        drawGlyphs: false,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...FadeTransitionEffect.defaultSettings, ...settings };
        
        this.cells = [];
        const divisions = this.settings.gridDivisions as number;
        const cellWidth = this.width / divisions;
        const cellHeight = this.height / divisions;

        for (let i = 0; i < divisions; i++) {
            for (let j = 0; j < divisions; j++) {
                this.cells.push(new FadeCell(i * cellWidth, j * cellHeight, cellWidth, cellHeight, this.totalDuration, divisions, divisions));
            }
        }
    }

    destroy() {
        this.cells = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.gridDivisions !== settings.gridDivisions;

        this.settings = { ...FadeTransitionEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        this.cells.forEach(cell => {
            cell.draw(ctx, this.currentTime, this.totalDuration, this.settings);
        });
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
