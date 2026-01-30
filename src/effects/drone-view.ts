
import { seededRandom, mapRange, randomRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const STREET_COLOR = '#080808';
const SWAY_PADDING = 60; // Padding to generate off-screen, must be > max cameraSway

class Building {
    x: number;
    y: number;
    width: number;
    height: number;
    rooftopPattern: number; // 0 for solid, 1 for lines
    seed: number;

    constructor(x: number, y: number, width: number, height: number, seed: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.rooftopPattern = Math.floor(seededRandom(seed+2) * 2); // Only 0 or 1
    }

    draw(ctx: CanvasRenderingContext2D, zoom: number, settings: VFXSettings) {
        const sideWidth = 4 * zoom; // Shadow/3D effect width

        const baseLightness = (settings.mapLightness as number) + seededRandom(this.seed) * 10 - 5;
        const rooftopColor = `hsl(${settings.mapHue}, 20%, ${baseLightness}%)`;
        const color = `hsl(${settings.mapHue}, 20%, ${baseLightness - 5}%)`; // Sightly darker side

        // Draw dark side for 3D effect
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width + sideWidth, this.y - sideWidth);
        ctx.lineTo(this.x + this.width + sideWidth, this.y + this.height - sideWidth);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + sideWidth, this.y + this.height - sideWidth);
        ctx.lineTo(this.x + this.width + sideWidth, this.y + this.height - sideWidth);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Draw main face
        ctx.fillStyle = rooftopColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw rooftop details
        if (this.rooftopPattern === 1) { // Horizontal lines
            ctx.strokeStyle = `hsl(${settings.mapHue}, 20%, ${(settings.mapLightness as number) + 15}%)`;
            ctx.lineWidth = 1 * zoom;
            for (let i = 5; i < this.height; i += 10) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + i);
                ctx.lineTo(this.x + this.width, this.y + i);
                ctx.stroke();
            }
        }
    }
}

class Vehicle {
    x: number;
    y: number;
    speed: number;
    isVertical: boolean;
    size: { w: number, h: number };
    seed: number;
    timeOffset: number;

    constructor(seed: number, isVertical: boolean, streetPosition: number, streetWidth: number, zoom: number) {
        this.seed = seed;
        this.isVertical = isVertical;
        this.speed = seededRandom(seed) * 50 + 20; // pixels per second
        this.timeOffset = seededRandom(seed + 1) * 100;
        
        if (isVertical) {
            this.size = { w: 3 * zoom, h: 6 * zoom };
        } else {
            this.size = { w: 6 * zoom, h: 3 * zoom };
        }
        
        const laneOffset = seededRandom(seed + 2) * (streetWidth - (isVertical ? this.size.w : this.size.h));
        
        if (isVertical) {
            this.x = streetPosition + laneOffset;
            this.y = 0; // Will be set in update
        } else {
            this.x = 0; // Will be set in update
            this.y = streetPosition + laneOffset;
        }
    }

    update(time: number, bounds: { width: number, height: number }) {
        const effectiveTime = time + this.timeOffset;
        if (this.isVertical) {
            this.y = (effectiveTime * this.speed) % (bounds.height + this.size.h) - this.size.h - SWAY_PADDING;
        } else {
            this.x = (effectiveTime * this.speed) % (bounds.width + this.size.w) - this.size.w - SWAY_PADDING;
        }
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const headlightHue = seededRandom(this.seed+3) > 0.3 ? 60 : 0; // yellow or red
        
        // Draw car body
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x, this.y, this.size.w, this.size.h);

        // Draw headlights
        const color = `hsl(${headlightHue}, 100%, ${settings.headlightLightness as number}%)`;
        ctx.fillStyle = color;
        if (this.isVertical) {
            // Headlights at the bottom, since y increases downwards
            ctx.fillRect(this.x, this.y + this.size.h - 1, this.size.w, 1);
        } else {
            // Headlights at the right, since x increases to the right
            ctx.fillRect(this.x + this.size.w - 1, this.y, 1, this.size.h);
        }
    }
}


export class DroneViewEffect implements VFXEffect {
    private settings: VFXSettings = DroneViewEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private bufferCanvas: HTMLCanvasElement;
    private bufferCtx: CanvasRenderingContext2D;
    private channelCanvas: HTMLCanvasElement;
    private channelCtx: CanvasRenderingContext2D;
    
    private width = 0;
    private height = 0;
    private currentTime = 0;

    private buildings: Building[] = [];
    private vehicles: Vehicle[] = [];
    private streets: { pos: number, width: number, isVertical: boolean }[] = [];

    static effectName = "Drone View";
    static defaultSettings: VFXSettings = {
        hue: 200,
        zoom: 1.0,
        buildingDensity: 80,
        trafficDensity: 50,
        chromaticAberration: 3,
        scanlineOpacity: 0.1,
        showLatitudeLines: true,
        showSearchLines: true,
        mapHue: 200,
        mapLightness: 15,
        headlightLightness: 80,
        mapBlur: 0,
        cameraSway: 0,
    };

    constructor() {
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCtx = this.bufferCanvas.getContext('2d')!;
        this.channelCanvas = document.createElement('canvas');
        this.channelCtx = this.channelCanvas.getContext('2d')!;
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.bufferCanvas.width = this.width;
        this.bufferCanvas.height = this.height;
        this.channelCanvas.width = this.width;
        this.channelCanvas.height = this.height;

        if (this.width === 0 || this.height === 0) return;
        this.settings = { ...DroneViewEffect.defaultSettings, ...settings };
        
        this.buildings = [];
        this.vehicles = [];
        this.streets = [];
        const zoom = this.settings.zoom as number;
        const buildingDensity = (this.settings.buildingDensity as number) / 100;
        
        const streetWidth = 20 * zoom;
        let seed = 0;
        
        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;

        // Generate vertical streets first and store their positions
        const verticalStreets: { pos: number, width: number }[] = [];
        let currentX = -SWAY_PADDING + (seededRandom(seed++) * 100 + 50) * zoom * buildingDensity;
        while (currentX < generationWidth - SWAY_PADDING) {
            const street = { pos: currentX, width: streetWidth, isVertical: true };
            this.streets.push(street);
            verticalStreets.push(street);
            currentX += streetWidth; // The street itself
            currentX += (seededRandom(seed++) * 200 + 100) * zoom * buildingDensity; // The building block
        }
        
        // Generate horizontal streets and the buildings between vertical streets
        let currentY = -SWAY_PADDING;
        seed = 1000; // Reset seed for determinism in the other axis
        while (currentY < generationHeight - SWAY_PADDING) {
            this.streets.push({ pos: currentY, width: streetWidth, isVertical: false });
            currentY += streetWidth;
            
            const remainingHeight = generationHeight - SWAY_PADDING - currentY;
            if (remainingHeight < 20 * zoom) break; // Not enough space for a meaningful block
            
            const blockHeight = (seededRandom(seed++) * 200 + 50) * zoom * buildingDensity;
            const finalBlockHeight = Math.min(blockHeight, remainingHeight);
            if(finalBlockHeight <= 0) break;

            // Iterate through the spaces between vertical streets to place buildings
            let lastVStreetEdge = -SWAY_PADDING;
            verticalStreets.forEach(vStreet => {
                const blockX = lastVStreetEdge;
                const blockWidth = vStreet.pos - lastVStreetEdge;
                if (blockWidth > streetWidth) { // Only add buildings if there's enough space
                    this.buildings.push(new Building(blockX, currentY, blockWidth, finalBlockHeight, seed++));
                }
                lastVStreetEdge = vStreet.pos + vStreet.width;
            });
            // Add buildings in the last block after the final vertical street
            if (lastVStreetEdge < generationWidth - SWAY_PADDING) {
                const blockX = lastVStreetEdge;
                const blockWidth = (generationWidth - SWAY_PADDING) - lastVStreetEdge;
                if (blockWidth > streetWidth) {
                    this.buildings.push(new Building(blockX, currentY, blockWidth, finalBlockHeight, seed++));
                }
            }

            currentY += finalBlockHeight;
        }


        // Vehicles
        const trafficDensity = (this.settings.trafficDensity as number) / 100;
        this.streets.forEach((street, i) => {
            const streetLength = street.isVertical ? generationHeight : generationWidth;
            const numCars = Math.floor(trafficDensity * streetLength / (50 * zoom));
            for(let j = 0; j < numCars; j++) {
                this.vehicles.push(new Vehicle(i*100 + j, street.isVertical, street.pos, street.width, zoom));
            }
        });
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        
        const needsReinit = this.width !== rect.width || this.height !== rect.height ||
            this.settings.zoom !== settings.zoom ||
            this.settings.buildingDensity !== settings.buildingDensity ||
            this.settings.trafficDensity !== settings.trafficDensity;
        
        this.settings = { ...DroneViewEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
        
        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;
        this.vehicles.forEach(v => v.update(this.currentTime, { width: generationWidth, height: generationHeight }));
    }

    drawScene(ctx: CanvasRenderingContext2D) {
        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;
        // Background / Streets
        ctx.fillStyle = STREET_COLOR;
        ctx.fillRect(-SWAY_PADDING, -SWAY_PADDING, generationWidth, generationHeight);
        
        // Apply blur if any
        const mapBlur = this.settings.mapBlur as number;
        if (mapBlur > 0) {
            ctx.filter = `blur(${mapBlur}px)`;
        }

        // Buildings
        this.buildings.forEach(b => b.draw(ctx, this.settings.zoom as number, this.settings));
        
        // Vehicles
        this.vehicles.forEach(v => v.draw(ctx, this.settings));

        // Reset filter
        if (mapBlur > 0) {
            ctx.filter = 'none';
        }
    }
    
    drawUI(ctx: CanvasRenderingContext2D) {
        const { hue, scanlineOpacity, showLatitudeLines, showSearchLines } = this.settings;
        const color = `hsl(${hue}, 80%, 70%)`;
        
        // Scanlines
        ctx.fillStyle = `rgba(0,0,0,${scanlineOpacity})`;
        for (let y = 0; y < this.height; y += 3) {
            ctx.fillRect(0, y, this.width, 1);
        }

        // GPS coordinates
        ctx.font = `bold 16px "Source Code Pro"`;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        const lat = (34.0522 + (seededRandom(Math.floor(this.currentTime*10)) - 0.5) * 0.0001).toFixed(6);
        const lon = (-118.2437 + (seededRandom(Math.floor(this.currentTime*10)+1) - 0.5) * 0.0001).toFixed(6);
        ctx.fillText(`GPS: ${lat}, ${lon}`, 20, 30);
        ctx.fillText(`ALT: ${(200 + Math.sin(this.currentTime) * 10).toFixed(2)}m`, 20, 50);

        // Latitude Lines
        if (showLatitudeLines) {
            const baseLat = 34.0;
            const baseLon = -118.5;
            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.6)`;
            ctx.lineWidth = 6;
            for(let i = 1; i < 5; i++) {
                const y = i * this.height / 5;
                for(let j = 1; j < 5; j++) {
                    const x = j * this.width / 5;

                    ctx.beginPath();
                    ctx.moveTo(x - 10, y);
                    ctx.lineTo(x + 10, y);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x, y - 10);
                    ctx.lineTo(x, y + 10);
                    ctx.stroke();
                }

                ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.5)`;
                const latLabel = (baseLat + i * 0.1).toFixed(1);
                const lonLabel = (baseLon + i * 0.1).toFixed(1);
                const x = i * this.width / 5;
                ctx.fillText(`${latLabel}`, 5, y - 5);
                ctx.fillText(`${lonLabel}`, x + 5, 15);
            }
        }
        
        // Search Lines
        if (showSearchLines) {
            const searchSpeed = 0.5;
            const searchY = (this.currentTime * this.height * searchSpeed) % this.height;
            const targetX = seededRandom(Math.floor(this.currentTime * 2)) * this.width;

            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.6)`;
            ctx.lineWidth = 4;
            
            // Horizontal sweep
            ctx.beginPath();
            ctx.moveTo(0, searchY);
            ctx.lineTo(this.width, searchY);
            ctx.stroke();
            
            // Vertical target
            ctx.beginPath();
            ctx.moveTo(targetX, 0);
            ctx.lineTo(targetX, this.height);
            ctx.stroke();

            ctx.strokeRect(targetX - 20, searchY - 20, 40, 40);
            ctx.fillText('SEARCHING...', targetX + 25, searchY - 10);
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        // Draw scene with sway into buffer
        this.bufferCtx.clearRect(0, 0, this.width, this.height);
        this.bufferCtx.save();
        
        const sway = this.settings.cameraSway as number;
        if (sway > 0) {
            const swayX = Math.sin(this.currentTime * 0.3) * sway * 0.7 + Math.sin(this.currentTime * 0.7) * sway * 0.3;
            const swayY = Math.sin(this.currentTime * 0.4) * sway * 0.7 + Math.sin(this.currentTime * 0.8) * sway * 0.3;
            this.bufferCtx.translate(-swayX, -swayY);
        }

        this.drawScene(this.bufferCtx);
        this.bufferCtx.restore();

        // Draw UI on top of buffer without sway
        this.drawUI(this.bufferCtx);


        // Render buffer to main canvas with post-processing
        const ca = this.settings.chromaticAberration as number;
        if (ca > 0) {
            ctx.clearRect(0, 0, this.width, this.height);

            // --- Red Channel ---
            this.channelCtx.clearRect(0, 0, this.width, this.height);
            this.channelCtx.drawImage(this.bufferCanvas, 0, 0);
            this.channelCtx.globalCompositeOperation = 'multiply';
            this.channelCtx.fillStyle = 'red';
            this.channelCtx.fillRect(0, 0, this.width, this.height);
            this.channelCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(this.channelCanvas, ca, 0);
            
            // --- Cyan Channel ---
            this.channelCtx.clearRect(0, 0, this.width, this.height);
            this.channelCtx.drawImage(this.bufferCanvas, 0, 0);
            this.channelCtx.globalCompositeOperation = 'multiply';
            this.channelCtx.fillStyle = 'cyan';
            this.channelCtx.fillRect(0, 0, this.width, this.height);
            this.channelCtx.globalCompositeOperation = 'source-over';
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(this.channelCanvas, -ca, 0);
            ctx.globalCompositeOperation = 'source-over';

        } else {
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.drawImage(this.bufferCanvas, 0, 0);
        }
    }
    
    getSettings(): VFXSettings { return this.settings; }
}
