
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';

class WireframeChar {
    x: number;
    y: number;
    z: number;
    rotY: number;
    char: string;
    
    vertices: { x: number; y: number; z: number }[];

    constructor(seed: number) {
        this.x = (seededRandom(seed) - 0.5) * 2000;
        this.y = (seededRandom(seed + 1) - 0.5) * 1000;
        this.z = seededRandom(seed + 2) * 1000;
        this.rotY = seededRandom(seed + 3) * Math.PI * 2;
        this.char = katakana[Math.floor(seededRandom(seed+4) * katakana.length)];
        this.vertices = this.createVerticesForChar(this.char);
    }
    
    // This is a simplified representation of a character as a 3D object
    createVerticesForChar(char: string): { x: number; y: number; z: number }[] {
        // Create a pseudo-3D shape based on the character's unicode value
        const charCode = char.charCodeAt(0);
        const seed = charCode;
        const points = [];
        for (let i = 0; i < 8; i++) {
            points.push({
                x: (seededRandom(seed + i * 3) - 0.5) * 50,
                y: (seededRandom(seed + i * 3 + 1) - 0.5) * 50,
                z: (seededRandom(seed + i * 3 + 2) - 0.5) * 50,
            });
        }
        return points;
    }

    update(time: number, speed: number) {
        this.rotY += 0.5 * speed * (1/60); // Fake deltaTime
        this.z -= 100 * speed * (1/60);
        if (this.z < -200) {
            this.z = 1000;
        }
    }

    draw(ctx: CanvasRenderingContext2D, fov: number, canvasWidth: number, canvasHeight: number, hue: number) {
        const projectedPoints: { x: number, y: number, z: number, scale: number }[] = [];

        for (const vertex of this.vertices) {
            // Rotation
            let x = vertex.x * Math.cos(this.rotY) - vertex.z * Math.sin(this.rotY);
            let z = vertex.x * Math.sin(this.rotY) + vertex.z * Math.cos(this.rotY);
            let y = vertex.y;

            // Final position
            x += this.x;
            y += this.y;
            z += this.z;

            // Projection
            const scale = fov / (fov + z);
            if (scale < 0) continue;

            projectedPoints.push({
                x: x * scale + canvasWidth / 2,
                y: y * scale + canvasHeight / 2,
                z: z,
                scale: scale
            });
        }
        
        if (projectedPoints.length < 2) return;

        const avgZ = projectedPoints.reduce((acc, p) => acc + p.z, 0) / projectedPoints.length;
        const opacity = mapRange(avgZ, -200, 1000, 1, 0) * 0.4;
        if(opacity <= 0) return;

        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${opacity})`;
        ctx.lineWidth = Math.max(0.5, projectedPoints[0].scale * 2);

        // Draw edges
        for (let i = 0; i < projectedPoints.length; i++) {
            for (let j = i + 1; j < projectedPoints.length; j++) {
                if(seededRandom(i*j) > 0.7) { // Randomly connect some vertices
                    ctx.beginPath();
                    ctx.moveTo(projectedPoints[i].x, projectedPoints[i].y);
                    ctx.lineTo(projectedPoints[j].x, projectedPoints[j].y);
                    ctx.stroke();
                }
            }
        }
    }
}

interface BootLine {
    text: string;
    result: string;
    time: number;
}

export class CyberdeckStartupEffect implements VFXEffect {
    private settings: VFXSettings = CyberdeckStartupEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private wireframeChars: WireframeChar[] = [];

    private bootLines: BootLine[] = [];
    private totalDuration = 6.0;
    private patternCache: Map<string, CanvasPattern | string> = new Map();

    static effectName = "Cyberdeck Startup";
    static defaultSettings: VFXSettings = {
        mainHue: 30, // Orange
        accentHue: 180, // Cyan
        scanlineOpacity: 0.08,
        wireframeCount: 50,
        progressBarPattern: 'Solid',
        progressBarSkew: 0.0,
        textSkew: 0.0,
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CyberdeckStartupEffect.defaultSettings, ...settings };
        this.patternCache.clear();
        
        this.wireframeChars = [];
        const count = this.settings.wireframeCount as number;
        for (let i = 0; i < count; i++) {
            this.wireframeChars.push(new WireframeChar(i));
        }

        this.bootLines = [
            { text: 'KAGE-OS v3.5 ブート...', result: '', time: 0.5 },
            { text: 'BIOS CHECK', result: '[ OK ]', time: 1.0 },
            { text: 'MEMORY CHECK (1024 ZB)', result: '[ OK ]', time: 1.3 },
            { text: 'ニューラル・リンク...', result: '[接続済み]', time: 1.6 }, // Neural Link... [Connected]
            { text: 'ICE検知...', result: '[クリア]', time: 2.0 }, // ICE Detection... [Clear]
            { text: 'Loading Combat Shell...', result: '', time: 2.5 },
        ];
    }

    destroy() {}

    private getProgressBarPattern(): CanvasPattern | string | null {
        const { progressBarPattern, accentHue } = this.settings;
        const patternName = progressBarPattern as string;
        
        const patternColor = `hsla(${accentHue as number}, 80%, 70%, 0.8)`;

        if (patternName === 'Solid') {
            return patternColor;
        }

        const cacheKey = `${patternName}-${accentHue}`;
        if (this.patternCache.has(cacheKey)) {
            return this.patternCache.get(cacheKey)!;
        }
        
        const backgroundColor = '#000'; //`hsla(${accentHue as number}, 80%, 30%, 0.8)`;

        const pCanvas = document.createElement('canvas');
        const pCtx = pCanvas.getContext('2d')!;
        let pattern: CanvasPattern | null = null;

        switch (patternName) {
            case 'Dashed 45': {
                pCanvas.width = 20;
                pCanvas.height = 20;
                pCtx.fillStyle = patternColor; //backgroundColor;
                pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                pCtx.strokeStyle = backgroundColor; //patternColor;
                pCtx.lineWidth = 3;
                pCtx.beginPath();
                pCtx.moveTo(0, 20);
                pCtx.lineTo(20, 0);
                pCtx.stroke();
                pattern = pCtx.createPattern(pCanvas, 'repeat');
                break;
            }
            case 'Dashed 30': {
                pCanvas.width = 35;
                pCanvas.height = 20;
                pCtx.fillStyle = patternColor; //backgroundColor;
                pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                pCtx.strokeStyle = backgroundColor; //patternColor;
                pCtx.lineWidth = 3;
                pCtx.beginPath();
                pCtx.moveTo(0, 20);
                pCtx.lineTo(35, 0);
                pCtx.stroke();
                pattern = pCtx.createPattern(pCanvas, 'repeat');
                break;
            }
            case 'Blocks': {
                pCanvas.width = 16;
                pCanvas.height = 16;
                pCtx.fillStyle = backgroundColor;
                pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                pCtx.fillStyle = patternColor;
                pCtx.fillRect(0, 0, 14, 16);
//                pCtx.fillRect(8, 8, 8, 8);
                pattern = pCtx.createPattern(pCanvas, 'repeat');
                break;
            }
            case 'Horizontal Lines': {
                pCanvas.width = 1;
                pCanvas.height = 4;
                pCtx.fillStyle = backgroundColor;
                pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                pCtx.fillStyle = patternColor;
                pCtx.fillRect(0, 0, 1, 2);
                pattern = pCtx.createPattern(pCanvas, 'repeat');
                break;
            }
        }

        if (pattern) {
            this.patternCache.set(cacheKey, pattern);
        }
        return pattern;
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height || this.settings.wireframeCount !== settings.wireframeCount;
        
        const settingsChanged = 
          this.settings.progressBarPattern !== settings.progressBarPattern ||
          this.settings.accentHue !== settings.accentHue;
          
        this.settings = { ...CyberdeckStartupEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
        if (settingsChanged) {
            this.patternCache.clear();
        }

        this.wireframeChars.forEach(c => c.update(this.currentTime, 1));
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

        const { mainHue, accentHue, textSkew, progressBarSkew } = this.settings;
        const timeInCycle = this.currentTime;
        const fov = this.width * 0.4;

        // Background
        ctx.fillStyle = `hsl(${mainHue}, 40%, 5%)`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Wireframe chars
        this.wireframeChars.forEach(c => c.draw(ctx, fov, this.width, this.height, accentHue as number));

        // Scanlines
        this.drawScanlines(ctx);
        
        // --- UI Elements ---
        ctx.textBaseline = 'top';
        const fontSize = Math.min(this.width, this.height) / 35;
        ctx.font = `bold ${fontSize}px "Source Code Pro", monospace`;
        const textColor = `hsl(${mainHue}, 90%, 60%)`;
        
        ctx.save();
        if (textSkew !== 0) {
            const skewOffset = (this.height / 2) * (textSkew as number);
            ctx.transform(1, 0, textSkew as number, 1, -skewOffset, 0);
        }

        // --- Header ---
        const headerY = this.height * 0.1;
        this.drawHorizontalLine(ctx, headerY - fontSize*1.5, 1);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('<< KAGE-DECK-MKIII >>', this.width / 2, headerY - fontSize * 0.5);
        this.drawHorizontalLine(ctx, headerY + fontSize, 1);
        
        // --- Boot sequence text ---
        ctx.textAlign = 'left';
        let currentY = this.height * 0.25;
        const lineHeight = fontSize * 1.5;
        const textX = this.width * 0.1;
        const resultX = this.width * 0.7;

        this.bootLines.forEach(line => {
            if(timeInCycle >= line.time) {
                // Typing effect
                const timeSinceAppear = timeInCycle - line.time;
                const charsToShow = Math.floor(timeSinceAppear * 40); // 40 chars/sec
                const textToDraw = line.text.substring(0, charsToShow);

                ctx.fillStyle = textColor;
                ctx.fillText(textToDraw, textX, currentY);

                if(line.result && timeSinceAppear > (line.text.length / 40) + 0.1) {
                    ctx.fillStyle = line.result.includes('OK') || line.result.includes('済み') ? `hsl(${accentHue as number}, 80%, 70%)` : textColor;
                    ctx.fillText(line.result, resultX, currentY);
                }

                currentY += lineHeight;
            }
        });
        
        ctx.restore(); // Restore from text skew

        // --- Loading Bar ---
        const loadingStartTime = 2.5;
        if (timeInCycle > loadingStartTime) {
            const loadingDuration = 2.0;
            const loadingY = currentY + lineHeight;
            let progress = (timeInCycle - loadingStartTime) / loadingDuration;
            progress = Math.min(1, progress);

            const barWidth = this.width * 0.8;
            const barX = this.width * 0.1;

            ctx.save();
            if (progressBarSkew !== 0) {
                 const skewOffset = loadingY * (progressBarSkew as number);
                 ctx.transform(1, 0, progressBarSkew as number, 1, -skewOffset, 0);
            }

            // Bar background
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, loadingY, barWidth, fontSize);
            
            // Bar fill
            const pattern = this.getProgressBarPattern();
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(barX, loadingY, barWidth * progress, fontSize);
            }
            
            ctx.restore();
        }

        // --- Footer ---
        ctx.save();
        if (textSkew !== 0) {
            const skewOffset = (this.height / 2) * (textSkew as number);
            ctx.transform(1, 0, textSkew as number, 1, -skewOffset, 0);
        }
        const footerY = this.height * 0.9;
        this.drawHorizontalLine(ctx, footerY, 1);
        if(timeInCycle > 4.5) {
             ctx.fillStyle = textColor;
             ctx.textAlign = 'center';
             const readyText = 'システム準備完了'; // System Ready
             const textToShow = readyText.substring(0, Math.floor((timeInCycle - 4.5) * 20));
             ctx.fillText(textToShow, this.width/2, footerY + fontSize * 0.5);
        }
        ctx.restore(); // Restore from text skew

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

    