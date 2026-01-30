
import { seededRandom, mapRange, randomRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const STREET_COLOR = '#080808';

class Building {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    rooftopColor: string;
    rooftopPattern: number; // 0 for solid, 1 for lines

    constructor(x: number, y: number, width: number, height: number, seed: number, settings: VFXSettings) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        const baseLightness = (settings.mapLightness as number) + seededRandom(seed) * 10 - 5;
        this.rooftopColor = `hsl(${settings.mapHue}, 20%, ${baseLightness}%)`;
        this.color = `hsl(${settings.mapHue}, 20%, ${baseLightness - 5}%)`; // Sightly darker side

        this.rooftopPattern = Math.floor(seededRandom(seed+2) * 2); // Only 0 or 1
    }

    draw(ctx: CanvasRenderingContext2D, zoom: number, settings: VFXSettings) {
        const sideWidth = 4 * zoom; // Shadow/3D effect width

        // Draw dark side for 3D effect
        ctx.fillStyle = this.color;
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
        ctx.fillStyle = this.rooftopColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw rooftop details
        ctx.strokeStyle = `hsl(${settings.mapHue}, 20%, ${(settings.mapLightness as number) + 15}%)`;
        ctx.lineWidth = 1 * zoom;
        if (this.rooftopPattern === 1) { // Horizontal lines
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
    color: string;
    seed: number;
    timeOffset: number;

    constructor(seed: number, isVertical: boolean, streetPosition: number, streetWidth: number, zoom: number, settings: VFXSettings) {
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
        
        const headlightHue = seededRandom(seed+3) > 0.3 ? 60 : 0; // yellow or red
        this.color = `hsl(${headlightHue}, 100%, ${settings.headlightLightness as number}%)`;
    }

    update(time: number, bounds: { width: number, height: number }) {
        const effectiveTime = time + this.timeOffset;
        if (this.isVertical) {
            this.y = (effectiveTime * this.speed) % (bounds.height + this.size.h) - this.size.h;
        } else {
            this.x = (effectiveTime * this.speed) % (bounds.width + this.size.w) - this.size.w;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Draw car body
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x, this.y, this.size.w, this.size.h);

        // Draw headlights
        ctx.fillStyle = this.color;
        if (this.isVertical) {
            // Headlights at the bottom, since y increases downwards
            ctx.fillRect(this.x, this.y + this.size.h - 1, 1, 1);
            ctx.fillRect(this.x + this.size.w - 1, this.y + this.size.h - 1, 1, 1);
        } else {
            // Headlights at the right, since x increases to the right
            ctx.fillRect(this.x + this.size.w - 1, this.y, 1, 1);
            ctx.fillRect(this.x + this.size.w - 1, this.y + this.size.h - 1, 1, 1);
        }
    }
}


export class DroneViewEffect implements VFXEffect {
    private settings: VFXSettings = DroneViewEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private bufferCanvas: HTMLCanvasElement;
    private bufferCtx: CanvasRenderingContext2D;
    
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
    };

    constructor() {
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCtx = this.bufferCanvas.getContext('2d')!;
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.bufferCanvas.width = this.width;
        this.bufferCanvas.height = this.height;

        if (this.width === 0 || this.height === 0) return;
        this.settings = { ...DroneViewEffect.defaultSettings, ...settings };
        
        this.buildings = [];
        this.vehicles = [];
        this.streets = [];
        const zoom = this.settings.zoom as number;
        const buildingDensity = (this.settings.buildingDensity as number) / 100;
        
        const streetWidth = 20 * zoom;
        let seed = 0;

        // Generate vertical streets first and store their positions
        const verticalStreets: { pos: number, width: number }[] = [];
        let currentX = (seededRandom(seed++) * 100 + 50) * zoom * buildingDensity; // Start with an initial block
        while (currentX < this.width) {
            const street = { pos: currentX, width: streetWidth, isVertical: true };
            this.streets.push(street);
            verticalStreets.push(street);
            currentX += streetWidth; // The street itself
            currentX += (seededRandom(seed++) * 200 + 100) * zoom * buildingDensity; // The building block
        }
        
        // Generate horizontal streets and the buildings between vertical streets
        let currentY = 0;
        seed = 1000; // Reset seed for determinism in the other axis
        while (currentY < this.height) {
            this.streets.push({ pos: currentY, width: streetWidth, isVertical: false });
            currentY += streetWidth;
            const blockHeight = (seededRandom(seed++) * 200 + 50) * zoom * buildingDensity;

            if (currentY + blockHeight > this.height) break;
            
            // Iterate through the spaces between vertical streets to place buildings
            let lastVStreetEdge = 0;
            verticalStreets.forEach(vStreet => {
                const blockX = lastVStreetEdge;
                const blockWidth = vStreet.pos - lastVStreetEdge;
                if (blockWidth > streetWidth) { // Only add buildings if there's enough space
                    this.buildings.push(new Building(blockX, currentY, blockWidth, blockHeight, seed++, this.settings));
                }
                lastVStreetEdge = vStreet.pos + vStreet.width;
            });
            // Add buildings in the last block after the final vertical street
            if (lastVStreetEdge < this.width) {
                const blockX = lastVStreetEdge;
                const blockWidth = this.width - lastVStreetEdge;
                if (blockWidth > streetWidth) {
                    this.buildings.push(new Building(blockX, currentY, blockWidth, blockHeight, seed++, this.settings));
                }
            }

            currentY += blockHeight;
        }


        // Vehicles
        const trafficDensity = (this.settings.trafficDensity as number) / 100;
        this.streets.forEach((street, i) => {
            const numCars = Math.floor(trafficDensity * (street.isVertical ? this.height : this.width) / (50 * zoom));
            for(let j = 0; j < numCars; j++) {
                this.vehicles.push(new Vehicle(i*100 + j, street.isVertical, street.pos, street.width, zoom, this.settings));
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

        this.vehicles.forEach(v => v.update(this.currentTime, { width: this.width, height: this.height }));
    }

    drawScene(ctx: CanvasRenderingContext2D) {
        // Background / Streets
        ctx.fillStyle = STREET_COLOR;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Apply blur if any
        const mapBlur = this.settings.mapBlur as number;
        if (mapBlur > 0) {
            ctx.filter = `blur(${mapBlur}px)`;
        }

        // Buildings
        this.buildings.forEach(b => b.draw(ctx, this.settings.zoom as number, this.settings));
        
        // Vehicles
        this.vehicles.forEach(v => v.draw(ctx));

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
        const lat = (34.0522 + (seededRandom(Math.floor(this.currentTime*10)) - 0.5) * 0.001).toFixed(6);
        const lon = (-118.2437 + (seededRandom(Math.floor(this.currentTime*10)+1) - 0.5) * 0.001).toFixed(6);
        ctx.fillText(`GPS: ${lat}, ${lon}`, 20, 30);
        ctx.fillText(`ALT: ${(200 + Math.sin(this.currentTime) * 10).toFixed(2)}m`, 20, 50);

        // Latitude Lines
        if (showLatitudeLines) {
            const baseLat = 34.0;
            const baseLon = -118.5;
            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.2)`;
            ctx.lineWidth = 3;
            for(let i = 1; i < 5; i++) {
                const y = i * this.height / 5;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
                ctx.stroke();

                const x = i * this.width / 5;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
                ctx.stroke();

                ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.4)`;
                const latLabel = (baseLat + i * 0.1).toFixed(1);
                const lonLabel = (baseLon + i * 0.1).toFixed(1);
                ctx.fillText(`LAT ${latLabel}`, 5, y - 5);
                ctx.fillText(`LON ${lonLabel}`, x + 5, 15);
            }
        }
        
        // Search Lines
        if (showSearchLines) {
            const searchSpeed = 0.5;
            const searchY = (this.currentTime * this.height * searchSpeed) % this.height;
            const targetX = seededRandom(Math.floor(this.currentTime * 2)) * this.width;

            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.6)`;
            ctx.lineWidth = 3;
            
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

        // Draw main scene and UI to buffer
        this.bufferCtx.clearRect(0, 0, this.width, this.height);
        this.drawScene(this.bufferCtx);
        this.drawUI(this.bufferCtx);

        // Render buffer to main canvas with effects
        ctx.clearRect(0, 0, this.width, this.height);
        const ca = this.settings.chromaticAberration as number;
        if (ca > 0) {
            // A simplified but effective chromatic aberration effect
            ctx.globalCompositeOperation = 'lighter';
            
            // Red channel
            ctx.drawImage(this.bufferCanvas, ca, 0);
            
            // Green channel (often shifted differently or not at all)
            ctx.drawImage(this.bufferCanvas, 0, 0);

            // Blue channel
            ctx.drawImage(this.bufferCanvas, -ca, 0);

            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.drawImage(this.bufferCanvas, 0, 0);
        }
    }
    
    getSettings(): VFXSettings { return this.settings; }
}
