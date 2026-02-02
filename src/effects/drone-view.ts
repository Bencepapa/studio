
import { seededRandom, mapRange, randomRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const STREET_COLOR = '#080808';
const SWAY_PADDING = 120; // Padding to generate off-screen, must be > max cameraSway
const GRID_CELL_SIZE = 10;

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

class PoliceCar {
    id: number;
    x: number;
    y: number;
    speed: number = 150; // Faster than normal traffic
    size: { w: number; h: number };
    currentStreet: { pos: number; width: number; isVertical: boolean };
    isStopped: boolean = false;
    timeOffset: number;

    constructor(
      seed: number,
      startStreet: { pos: number; width: number; isVertical: boolean },
      canvasWidth: number,
      canvasHeight: number
    ) {
        this.id = seed;
        this.currentStreet = startStreet;
        this.timeOffset = seededRandom(seed * 10) * 10;
        
        const baseSizeW = 4;
        const baseSizeH = 8;

        if (this.currentStreet.isVertical) {
            this.size = { w: baseSizeW, h: baseSizeH };
            this.x = this.currentStreet.pos + (this.currentStreet.width - this.size.w) / 2;
            this.y = seededRandom(seed) > 0.5 ? -this.size.h - SWAY_PADDING : canvasHeight + SWAY_PADDING;
        } else {
            this.size = { w: baseSizeH, h: baseSizeW };
            this.x = seededRandom(seed) > 0.5 ? -this.size.w - SWAY_PADDING : canvasWidth + SWAY_PADDING;
            this.y = this.currentStreet.pos + (this.currentStreet.width - this.size.h) / 2;
        }
    }

    update(deltaTime: number, target: { x: number; y: number }, streets: { pos: number; width: number; isVertical: boolean }[]) {
        if (this.isStopped) return;
        
        const parkOffsetAngle = this.id * (Math.PI / 2) + Math.PI / 4; // Each car gets a 45 degree slot
        const parkOffsetDistance = 15; 
        const finalTargetX = target.x + Math.cos(parkOffsetAngle) * parkOffsetDistance;
        const finalTargetY = target.y + Math.sin(parkOffsetAngle) * parkOffsetDistance;

        const stopDistance = 5;
        if (Math.abs(this.x - finalTargetX) < stopDistance && Math.abs(this.y - finalTargetY) < stopDistance) {
            this.isStopped = true;
            return;
        }

        let moveAmount = this.speed * deltaTime;

        if (this.currentStreet.isVertical) {
            const dx = finalTargetX - this.x;
            const dy = finalTargetY - this.y;

            if (Math.abs(dx) > this.currentStreet.width) {
                let nearestHStreet: { pos: number, width: number, isVertical: boolean } | null = null;
                let minDist = Infinity;
                for (const s of streets) {
                    if (!s.isVertical) {
                        const dist = Math.abs(this.y - s.pos);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestHStreet = s;
                        }
                    }
                }
                
                if (nearestHStreet) {
                    if (Math.abs(this.y - nearestHStreet.pos) > moveAmount) {
                        this.y += Math.sign(nearestHStreet.pos - this.y) * moveAmount;
                    } else {
                        // Switch street and orientation
                        this.y = nearestHStreet.pos + (nearestHStreet.width - this.size.w) / 2; // size.w is now the new height
                        [this.size.w, this.size.h] = [this.size.h, this.size.w];
                        this.currentStreet = nearestHStreet;
                    }
                }
            } else {
                this.y += Math.sign(dy) * moveAmount;
            }
        } else { // On horizontal street
            const dx = finalTargetX - this.x;
            const dy = finalTargetY - this.y;
            
            if (Math.abs(dy) > this.currentStreet.width) {
                 let nearestVStreet: { pos: number, width: number, isVertical: boolean } | null = null;
                 let minDist = Infinity;
                 for (const s of streets) {
                     if (s.isVertical) {
                         const dist = Math.abs(this.x - s.pos);
                         if (dist < minDist) {
                             minDist = dist;
                             nearestVStreet = s;
                         }
                     }
                 }
                if (nearestVStreet) {
                     if (Math.abs(this.x - nearestVStreet.pos) > moveAmount) {
                         this.x += Math.sign(nearestVStreet.pos - this.x) * moveAmount;
                     } else {
                         // Switch street and orientation
                         this.x = nearestVStreet.pos + (nearestVStreet.width - this.size.h) / 2; // size.h is now the new width
                         [this.size.w, this.size.h] = [this.size.h, this.size.w];
                         this.currentStreet = nearestVStreet;
                     }
                 }
            } else {
                this.x += Math.sign(dx) * moveAmount;
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D, time: number) {
        // Car Body
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x, this.y, this.size.w, this.size.h);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.size.w, this.size.h);

        // Flashing lights
        const isRedPhase = Math.floor((time + this.timeOffset) * 10) % 2 === 0;
        const color1 = isRedPhase ? 'hsl(0, 100%, 60%)' : 'hsl(200, 100%, 60%)';
        const color2 = isRedPhase ? 'hsl(200, 100%, 60%)' : 'hsl(0, 100%, 60%)';
        const glow1 = isRedPhase ? 'hsla(0, 100%, 60%, 0.7)' : 'hsla(200, 100%, 60%, 0.7)';
        const glow2 = isRedPhase ? 'hsla(200, 100%, 60%, 0.7)' : 'hsla(0, 100%, 60%, 0.7)';
        
        ctx.save();
        ctx.shadowBlur = 15;
        
        // Draw roof-mounted light bar
        const roofLightW = this.currentStreet.isVertical ? this.size.w + 3 : 4;
        const roofLightH = this.currentStreet.isVertical ? 2 : this.size.h + 6;
        
        // Red light
        ctx.shadowColor = glow1;
        ctx.fillStyle = color1;
        if (this.currentStreet.isVertical) {
            ctx.fillRect(this.x - 1.5, this.y + this.size.h * 0.2, roofLightW, this.size.h * 0.25);
        } else {
            ctx.fillRect(this.x + this.size.w * 0.2, this.y - 3, this.size.w * 0.25, roofLightH);
        }
        
        // Blue light
        ctx.shadowColor = glow2;
        ctx.fillStyle = color2;
        if (this.currentStreet.isVertical) {
            ctx.fillRect(this.x - 1.5, this.y + this.size.h * 0.55, roofLightW, this.size.h * 0.25);
        } else {
             ctx.fillRect(this.x + this.size.w * 0.55, this.y - 3, this.size.w * 0.25, roofLightH);
        }
        
        ctx.restore();
    }
}


export class DroneViewEffect implements VFXEffect {
    private settings: VFXSettings = DroneViewEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private bufferCanvas: HTMLCanvasElement;
    private bufferCtx: CanvasRenderingContext2D;
    
    private width = 0;
    private height = 0;
    private gridWidth = 0;
    private gridHeight = 0;
    private currentTime = 0;

    private buildings: Building[] = [];
    private vehicles: Vehicle[] = [];
    private policeCars: PoliceCar[] = [];
    private streets: { pos: number, width: number, isVertical: boolean }[] = [];
    private obstacleGrid: number[][] = [];

    private capturePosition: { x: number, y: number } | null = null;
    private worldCapturePosition: { x: number, y: number } | null = null;
    private wasCapturing: boolean = false;
    private targetInfo: { ip: string, mac: string } | null = null;

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
        capture: false,
        deckName: 'KENSHIN',
        nickname: 'ZERO_COOL',
        rank: 'S-CLASS',
    };

    constructor() {
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCtx = this.bufferCanvas.getContext('2d')!;
    }
    
    private isStreet(gridX: number, gridY: number): boolean {
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            return false;
        }
        // Assuming streets are where obstacleGrid is 0
        return this.obstacleGrid[gridX]?.[gridY] === 0;
    }

    private findNearestStreet(targetWorldX: number, targetWorldY: number): { x: number, y: number } {
        const startGridX = Math.floor(targetWorldX / GRID_CELL_SIZE);
        const startGridY = Math.floor(targetWorldY / GRID_CELL_SIZE);

        if (this.isStreet(startGridX, startGridY)) {
            return { x: targetWorldX, y: targetWorldY };
        }

        let x = 0, y = 0, dx = 0, dy = -1;
        // Spiral search for the nearest non-obstacle cell
        for (let i = 0; i < Math.pow(Math.max(this.gridWidth, this.gridHeight), 2); i++) {
            const currentGridX = startGridX + x;
            const currentGridY = startGridY + y;
            
            if (this.isStreet(currentGridX, currentGridY)) {
                // Found a street, return its world coordinates
                return { 
                    x: currentGridX * GRID_CELL_SIZE + GRID_CELL_SIZE / 2, 
                    y: currentGridY * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 
                };
            }

            if ((x === y) || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
                [dx, dy] = [-dy, dx]; // change direction
            }
            x += dx;
            y += dy;
        }

        // Fallback to the original target if somehow no street is found (should be impossible)
        return { x: targetWorldX, y: targetWorldY };
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
        this.policeCars = [];
        this.streets = [];
        this.obstacleGrid = [];
        const zoom = this.settings.zoom as number;
        const buildingDensity = (this.settings.buildingDensity as number) / 100;
        
        const streetWidth = 20; // world units, not scaled by zoom
        let seed = 0;
        
        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;

        this.gridWidth = Math.ceil(generationWidth / GRID_CELL_SIZE);
        this.gridHeight = Math.ceil(generationHeight / GRID_CELL_SIZE);
        this.obstacleGrid = Array(this.gridWidth).fill(0).map(() => Array(this.gridHeight).fill(0));

        const verticalStreets: { pos: number, width: number }[] = [];
        let currentX = -SWAY_PADDING + (seededRandom(seed++) * 100 + 50);
        while (currentX < generationWidth - SWAY_PADDING) {
            const street = { pos: currentX, width: streetWidth, isVertical: true };
            this.streets.push(street);
            verticalStreets.push(street);
            currentX += streetWidth;
            currentX += (seededRandom(seed++) * 200 + 100) * buildingDensity;
        }
        
        let currentY = -SWAY_PADDING;
        seed = 1000;
        while (currentY < generationHeight - SWAY_PADDING) {
            this.streets.push({ pos: currentY, width: streetWidth, isVertical: false });
            currentY += streetWidth;
            
            const remainingHeight = generationHeight - SWAY_PADDING - currentY;
            if (remainingHeight < 20) break;
            
            const blockHeight = (seededRandom(seed++) * 200 + 50) * buildingDensity;
            const finalBlockHeight = Math.min(blockHeight, remainingHeight);
            if(finalBlockHeight <= 0) break;

            let lastVStreetEdge = -SWAY_PADDING;
            verticalStreets.forEach(vStreet => {
                const blockX = lastVStreetEdge;
                const blockWidth = vStreet.pos - lastVStreetEdge;
                if (blockWidth > streetWidth) {
                    this.buildings.push(new Building(blockX, currentY, blockWidth, finalBlockHeight, seed++));
                    
                    const startGridX = Math.floor(blockX / GRID_CELL_SIZE);
                    const endGridX = Math.ceil((blockX + blockWidth) / GRID_CELL_SIZE);
                    const startGridY = Math.floor(currentY / GRID_CELL_SIZE);
                    const endGridY = Math.ceil((currentY + finalBlockHeight) / GRID_CELL_SIZE);

                    for(let gx = startGridX; gx < endGridX; gx++){
                        for(let gy = startGridY; gy < endGridY; gy++){
                            if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
                                this.obstacleGrid[gx][gy] = 1;
                            }
                        }
                    }
                }
                lastVStreetEdge = vStreet.pos + vStreet.width;
            });
            if (lastVStreetEdge < generationWidth - SWAY_PADDING) {
                const blockX = lastVStreetEdge;
                const blockWidth = (generationWidth - SWAY_PADDING) - lastVStreetEdge;
                if (blockWidth > streetWidth) {
                    this.buildings.push(new Building(blockX, currentY, blockWidth, finalBlockHeight, seed++));

                    const startGridX = Math.floor(blockX / GRID_CELL_SIZE);
                    const endGridX = Math.ceil((blockX + blockWidth) / GRID_CELL_SIZE);
                    const startGridY = Math.floor(currentY / GRID_CELL_SIZE);
                    const endGridY = Math.ceil((currentY + finalBlockHeight) / GRID_CELL_SIZE);
                    for(let gx = startGridX; gx < endGridX; gx++){
                        for(let gy = startGridY; gy < endGridY; gy++){
                           if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
                                this.obstacleGrid[gx][gy] = 1;
                           }
                        }
                    }
                }
            }

            currentY += finalBlockHeight;
        }

        const trafficDensity = (this.settings.trafficDensity as number) / 100;
        this.streets.forEach((street, i) => {
            const streetLength = street.isVertical ? generationHeight : generationWidth;
            const numCars = Math.floor(trafficDensity * streetLength / 50);
            for(let j = 0; j < numCars; j++) {
                this.vehicles.push(new Vehicle(i*100 + j, street.isVertical, street.pos, street.width, 1));
            }
        });
    }

    destroy() {}

    spawnPoliceCars(count: number) {
        this.policeCars = [];
        for (let i = 0; i < count; i++) {
            const startStreet = this.streets[Math.floor(seededRandom(this.currentTime + i) * this.streets.length)];
            const policeCar = new PoliceCar(i, startStreet, this.width, this.height);
            this.policeCars.push(policeCar);
        }
    }

    generateIp(seed: number): string {
        return `${Math.floor(seededRandom(seed)*255)}.${Math.floor(seededRandom(seed+1)*255)}.${Math.floor(seededRandom(seed+2)*255)}.${Math.floor(seededRandom(seed+3)*255)}`;
    }

    generateMac(seed: number): string {
        let mac = '';
        for (let i=0; i<6; i++) {
            mac += Math.floor(seededRandom(seed+i)*255).toString(16).padStart(2,'0').toUpperCase();
            if (i<5) mac += ':';
        }
        return mac;
    }


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
            if (this.wasCapturing) {
                this.spawnPoliceCars(4);
            }
            return;
        }
        
        const { capture, cameraSway, zoom } = this.settings;

        if (capture && !this.wasCapturing) {
            // Just switched ON
            this.capturePosition = { 
                x: seededRandom(this.currentTime) * (this.width - 200) + 100, 
                y: seededRandom(this.currentTime + 1) * (this.height - 200) + 100
            };
            this.targetInfo = {
                ip: this.generateIp(this.currentTime),
                mac: this.generateMac(this.currentTime)
            };

            // Convert screen-space capture pos to fixed world-space pos
            const sway = cameraSway as number;
            const z = zoom as number;
            const swayX = (sway > 0) ? Math.sin(this.currentTime * 0.3) * sway * 0.7 + Math.sin(this.currentTime * 0.7) * sway * 0.3 : 0;
            const swayY = (sway > 0) ? Math.sin(this.currentTime * 0.4) * sway * 0.7 + Math.sin(this.currentTime * 0.8) * sway * 0.3 : 0;
            const captureInSwaySpaceX = this.capturePosition.x + swayX;
            const captureInSwaySpaceY = this.capturePosition.y + swayY;
            this.worldCapturePosition = {
                x: (captureInSwaySpaceX - this.width / 2) / z + this.width / 2,
                y: (captureInSwaySpaceY - this.height / 2) / z + this.height / 2,
            };

            this.spawnPoliceCars(4);

        } else if (!capture && this.wasCapturing) {
            // Just switched OFF
            this.capturePosition = null;
            this.worldCapturePosition = null;
            this.policeCars = [];
            this.targetInfo = null;
        }

        this.wasCapturing = capture as boolean;

        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;
        this.vehicles.forEach(v => v.update(this.currentTime, { width: generationWidth, height: generationHeight }));
        
        if (this.worldCapturePosition) {
            const streetTarget = this.findNearestStreet(this.worldCapturePosition.x, this.worldCapturePosition.y);
            this.policeCars.forEach(p => p.update(deltaTime, streetTarget, this.streets));
        }
    }

    drawScene(ctx: CanvasRenderingContext2D) {
        const generationWidth = this.width + SWAY_PADDING * 2;
        const generationHeight = this.height + SWAY_PADDING * 2;
        ctx.fillStyle = STREET_COLOR;
        ctx.fillRect(-SWAY_PADDING, -SWAY_PADDING, generationWidth, generationHeight);
        
        const mapBlur = this.settings.mapBlur as number;
        if (mapBlur > 0) {
            ctx.filter = `blur(${mapBlur}px)`;
        }

        this.buildings.forEach(b => b.draw(ctx, 1.0, this.settings)); // Pass zoom 1.0 since we scale the whole context
        this.vehicles.forEach(v => v.draw(ctx, this.settings));
        this.policeCars.forEach(p => p.draw(ctx, this.currentTime));

        if (mapBlur > 0) {
            ctx.filter = 'none';
        }
    }
    
    drawCaptureInfo(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const { hue, deckName, nickname, rank } = this.settings;
        const infoColor = `hsl(${hue}, 80%, 70%)`;
        const labelColor = `hsla(${hue}, 40%, 80%, 0.8)`;
        const panelColor = `hsla(${hue}, 60%, 10%, 0.7)`;

        const panelWidth = 200;
        const panelHeight = 130;
        const panelX = x > this.width / 2 ? x - panelWidth - 30 : x + 30;
        const panelY = y > this.height / 2 ? y - panelHeight - 30 : y + 30;
        
        ctx.fillStyle = panelColor;
        ctx.strokeStyle = infoColor;
        ctx.lineWidth = 1;
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        ctx.font = `12px "Source Code Pro"`;
        ctx.textAlign = 'left';
        
        const textX = panelX + 10;
        let textY = panelY + 20;
        
        const drawLine = (label: string, value: string) => {
            ctx.fillStyle = labelColor;
            ctx.fillText(label, textX, textY);
            ctx.fillStyle = infoColor;
            ctx.fillText(value, textX + 45, textY);
            textY += 15;
        }

        if (this.targetInfo) {
            drawLine('IP:', this.targetInfo.ip);
            drawLine('MAC:', this.targetInfo.mac);
        }
        drawLine('DECK:', deckName as string);
        drawLine('USER:', nickname as string);
        drawLine('RANK:', rank as string);
    }

    drawUI(ctx: CanvasRenderingContext2D) {
        const { hue, scanlineOpacity, showLatitudeLines, showSearchLines, capture, zoom, cameraSway } = this.settings;
        const color = `hsl(${hue}, 80%, 70%)`;
        
        ctx.fillStyle = `rgba(0,0,0,${scanlineOpacity})`;
        for (let y = 0; y < this.height; y += 3) {
            ctx.fillRect(0, y, this.width, 1);
        }

        ctx.font = `bold 16px "Source Code Pro"`;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        const lat = (34.0522 + (seededRandom(Math.floor(this.currentTime*10)) - 0.5) * 0.0001).toFixed(6);
        const lon = (-118.2437 + (seededRandom(Math.floor(this.currentTime*10)+1) - 0.5) * 0.0001).toFixed(6);
        
        if (capture && this.capturePosition) {
            const fixedLat = (34.0522 + (this.capturePosition.y / this.height - 0.5) * 0.1).toFixed(6);
            const fixedLon = (-118.2437 + (this.capturePosition.x / this.width - 0.5) * 0.1).toFixed(6);
            ctx.fillText(`GPS: ${fixedLat}, ${fixedLon}`, 20, 30);
        } else {
             ctx.fillText(`GPS: ${lat}, ${lon}`, 20, 30);
        }
        ctx.fillText(`ALT: ${(200 + Math.sin(this.currentTime) * 10).toFixed(2)}m`, 20, 50);

        if (showLatitudeLines) {
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
            }
        }
        
        if (showSearchLines && capture && this.worldCapturePosition) {
            // Convert world pos back to screen pos including sway and zoom
            const z = zoom as number;
            const sway = cameraSway as number;
            const worldTarget = this.worldCapturePosition!;
            const targetInViewX = (worldTarget.x - this.width / 2) * z + this.width / 2;
            const targetInViewY = (worldTarget.y - this.height / 2) * z + this.height / 2;
            const swayX = (sway > 0) ? Math.sin(this.currentTime * 0.3) * sway * 0.7 + Math.sin(this.currentTime * 0.7) * sway * 0.3 : 0;
            const swayY = (sway > 0) ? Math.sin(this.currentTime * 0.4) * sway * 0.7 + Math.sin(this.currentTime * 0.8) * sway * 0.3 : 0;
            const finalScreenX = targetInViewX - swayX;
            const finalScreenY = targetInViewY - swayY;

            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.8)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, finalScreenY);
            ctx.lineTo(this.width, finalScreenY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(finalScreenX, 0);
            ctx.lineTo(finalScreenX, this.height);
            ctx.stroke();
            ctx.strokeRect(finalScreenX - 20, finalScreenY - 20, 40, 40);

            const isBlinking = Math.sin(this.currentTime * 10) > 0;
            if (isBlinking) {
                ctx.font = `bold 20px "Source Code Pro"`;
                ctx.textAlign = 'center';
                ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
                ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
                ctx.shadowBlur = 10;
                ctx.fillText('LOCATED', finalScreenX, finalScreenY - 35);
                ctx.shadowBlur = 0;
            }

            this.drawCaptureInfo(ctx, finalScreenX, finalScreenY);
        } else if (showSearchLines) {
            const searchSpeed = 0.5;
            const searchY = (this.currentTime * this.height * searchSpeed) % this.height;
            const targetX = seededRandom(Math.floor(this.currentTime * 2)) * this.width;
            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.6)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, searchY);
            ctx.lineTo(this.width, searchY);
            ctx.stroke();
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

        // 1. Draw the entire scene (map + UI) to the off-screen buffer.
        this.bufferCtx.save();
        
        const zoom = this.settings.zoom as number;
        this.bufferCtx.translate(this.width / 2, this.height / 2);
        this.bufferCtx.scale(zoom, zoom);
        this.bufferCtx.translate(-this.width / 2, -this.height / 2);

        const sway = this.settings.cameraSway as number;
        if (sway > 0) {
            const swayX = Math.sin(this.currentTime * 0.3) * sway * 0.7 + Math.sin(this.currentTime * 0.7) * sway * 0.3;
            const swayY = Math.sin(this.currentTime * 0.4) * sway * 0.7 + Math.sin(this.currentTime * 0.8) * sway * 0.3;
            this.bufferCtx.translate(-swayX, -swayY);
        }

        this.drawScene(this.bufferCtx);
        this.bufferCtx.restore();
        this.drawUI(this.bufferCtx);

        // 2. Draw the buffer to the main canvas with effects.
        const ca = this.settings.chromaticAberration as number;
        ctx.clearRect(0, 0, this.width, this.height);
        
        if (ca > 0) {
            ctx.globalCompositeOperation = 'lighter';
            
            // Red channel
            ctx.save();
            ctx.drawImage(this.bufferCanvas, -ca, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(255,0,0)';
            ctx.fillRect(0,0,this.width, this.height);
            ctx.restore();

            // Green channel
            ctx.save();
            ctx.drawImage(this.bufferCanvas, 0, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(0,255,0)';
            ctx.fillRect(0,0,this.width, this.height);
            ctx.restore();

            // Blue channel
            ctx.save();
            ctx.drawImage(this.bufferCanvas, ca, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(0,0,255)';
            ctx.fillRect(0,0,this.width, this.height);
            ctx.restore();

            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.drawImage(this.bufferCanvas, 0, 0);
        }
    }
    
    getSettings(): VFXSettings { return this.settings; }
}
