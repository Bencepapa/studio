
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const GRID_CELL_SIZE = 10;
const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';


// --- Helper classes for Pathfinding ---
class PathNode {
    x: number;
    y: number;
    g: number = 0; // cost from start
    h: number = 0; // heuristic cost to end
    f: number = 0; // g + h
    parent: PathNode | null = null;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

// --- Board and Component classes ---
class Pin {
    x: number; // grid x
    y: number; // grid y
    direction: 'n' | 'e' | 's' | 'w';
    isOccupied: boolean = false;

    constructor(x: number, y: number, direction: 'n' | 'e' | 's' | 'w') {
        this.x = x;
        this.y = y;
        this.direction = direction;
    }
}

class BoardComponent {
    x: number; // grid top-left x
    y: number; // grid top-left y
    width: number; // in grid cells
    height: number; // in grid cells
    pins: Pin[] = [];

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getFreePin(): Pin | null {
        const freePins = this.pins.filter(p => !p.isOccupied);
        if (freePins.length === 0) return null;
        const pin = freePins[Math.floor(seededRandom(this.x + this.y + freePins.length) * freePins.length)];
        return pin;
    }

    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const { hue } = settings;
        const px = this.x * GRID_CELL_SIZE;
        const py = this.y * GRID_CELL_SIZE;
        const pw = this.width * GRID_CELL_SIZE;
        const ph = this.height * GRID_CELL_SIZE;
        
        ctx.fillStyle = `hsl(${hue}, 50%, 15%)`;
        ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
        ctx.lineWidth = 1;

        ctx.fillRect(px, py, pw, ph);
        ctx.strokeRect(px, py, pw, ph);

        // Draw pins
        ctx.fillStyle = `hsl(${hue}, 40%, 40%)`;
        this.pins.forEach(pin => {
            ctx.fillRect((pin.x+0.5) * GRID_CELL_SIZE-2.5, (pin.y + 0.5) * GRID_CELL_SIZE -2.5, 5, 5);
        });
    }
}

class CPUComponent extends BoardComponent {
    glyph: string;
    subGlyph: string;

    constructor(x: number, y: number, width: number, height: number, pinCountPerSide: number) {
        super(x, y, width, height);
        this.glyph = katakana.charAt(Math.floor(seededRandom(x + y) * katakana.length));
        const subGlyphNumber = Math.floor(seededRandom(x + y + 1) * 256);
        this.subGlyph = `0x${subGlyphNumber.toString(16).toUpperCase().padStart(2, '0')}`;

        if (pinCountPerSide < 1) return;
        
        const safePinCount = Math.max(2, pinCountPerSide);

        const pinSpacingX = (width - 1) / (safePinCount - 1);
        const pinSpacingY = (height - 1) / (safePinCount - 1);
        
        for (let i = 0; i < pinCountPerSide; i++) {
            const pinX = x + Math.round(i * pinSpacingX);
            const pinY = y + Math.round(i * pinSpacingY);

             // Top & Bottom pins
             this.pins.push(new Pin(pinX, y - 1, 'n'));
             this.pins.push(new Pin(pinX, y + height, 's'));
            
             // Left & Right pins
             // Only add side pins if they are not at the corners to avoid crowding
             if (i > 0 && i < pinCountPerSide -1) {
                 this.pins.push(new Pin(x - 1, pinY, 'w'));
                 this.pins.push(new Pin(x + width, pinY, 'e'));
             }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        super.draw(ctx, settings);
        
        const { hue } = settings;
        const px = this.x * GRID_CELL_SIZE;
        const py = this.y * GRID_CELL_SIZE;
        const pw = this.width * GRID_CELL_SIZE;
        const ph = this.height * GRID_CELL_SIZE;
        
        // Main Glyph
        const glyphSize = Math.min(pw, ph) * 0.6;
        ctx.font = `bold ${glyphSize}px "Source Code Pro", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const mainGlyphY = py + ph / 2 - glyphSize * 0.1;

        // Emboss effect
        ctx.fillStyle = `hsl(${hue}, 80%, 20%)`; // Darker shadow
        ctx.fillText(this.glyph, px + pw / 2 + 2, mainGlyphY + 2);

        ctx.fillStyle = `hsl(${hue}, 80%, 40%)`; // Main color
        ctx.fillText(this.glyph, px + pw / 2, mainGlyphY);

        // Sub Glyph (8-bit number)
        const subGlyphSize = glyphSize * 0.3;
        ctx.font = `bold ${subGlyphSize}px "Source Code Pro", monospace`;
        const subGlyphY = mainGlyphY + glyphSize * 0.5;

        // Emboss effect for sub-glyph
        ctx.fillStyle = `hsl(${hue}, 80%, 20%)`; // Darker shadow
        ctx.fillText(this.subGlyph, px + pw / 2 + 1, subGlyphY + 1);
        
        ctx.fillStyle = `hsl(${hue}, 80%, 40%)`; // Main color
        ctx.fillText(this.subGlyph, px + pw / 2, subGlyphY);
    }
}

class ICComponent extends BoardComponent {
    glyph: string | null = null;
    
    constructor(x: number, y: number, width: number, height: number, pinCountPerSide: number) {
        super(x, y, width, height);
        
        if (pinCountPerSide < 1) return;
        
        const safePinCount = Math.max(2, pinCountPerSide);
        const isVertical = height > width;

        if (isVertical) {
            const pinSpacing = (height - 1) / (safePinCount - 1);
            for (let i = 0; i < pinCountPerSide; i++) {
                const pinY = y + Math.round(i * pinSpacing);
                this.pins.push(new Pin(x - 1, pinY, 'w'));
                this.pins.push(new Pin(x + width, pinY, 'e'));
            }
        } else {
            const pinSpacing = (width - 1) / (safePinCount - 1);
            for (let i = 0; i < pinCountPerSide; i++) {
                const pinX = x + Math.round(i * pinSpacing);
                this.pins.push(new Pin(pinX, y - 1, 'n'));
                this.pins.push(new Pin(pinX, y + height, 's'));
            }
        }
        
        if (width >= 4 && height >= 4) {
            this.glyph = katakana.charAt(Math.floor(seededRandom(x + y) * katakana.length));
        }
    }
    
    draw(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        super.draw(ctx, settings);

        if (this.glyph) {
            const { hue } = settings;
            const px = this.x * GRID_CELL_SIZE;
            const py = this.y * GRID_CELL_SIZE;
            const pw = this.width * GRID_CELL_SIZE;
            const ph = this.height * GRID_CELL_SIZE;
        
            const glyphSize = Math.min(pw, ph) * 0.7;
            ctx.font = `bold ${glyphSize}px "Source Code Pro", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Emboss effect
            ctx.fillStyle = `hsl(${hue}, 80%, 20%)`; // Darker shadow
            ctx.fillText(this.glyph, px + pw / 2 + 2, py + ph / 2 + 2);

            ctx.fillStyle = `hsl(${hue}, 80%, 40%)`; // Main color
            ctx.fillText(this.glyph, px + pw / 2, py + ph / 2);
        }
    }
}

class Trace {
    path: { x: number, y: number }[];
    delay: number;
    duration: number;
    pathLength: number = 0;

    constructor(path: { x: number, y: number }[], totalDuration: number, seed: number) {
        this.path = path;
        this.duration = seededRandom(seed) * 1.5 + 0.5;
        this.delay = seededRandom(seed + 1) * (totalDuration - this.duration);
        this.pathLength = path.length;
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings) {
        const timeInCycle = time - this.delay;
        if (timeInCycle < 0 || timeInCycle > this.duration || this.path.length < 2) {
            return;
        }

        const { hue } = settings;
        const progress = timeInCycle / this.duration;

        // Draw static trace
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.2)`;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo((this.path[0].x + 0.5) * GRID_CELL_SIZE, (this.path[0].y + 0.5) * GRID_CELL_SIZE);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo((this.path[i].x + 0.5) * GRID_CELL_SIZE, (this.path[i].y + 0.5) * GRID_CELL_SIZE);
        }
        ctx.stroke();

        // Draw moving head
        const headIndex = Math.floor(progress * (this.pathLength - 1));
        const segmentProgress = (progress * (this.pathLength - 1)) % 1;
        
        const from = this.path[headIndex];
        const to = this.path[headIndex + 1];

        if (!from || !to) return;

        const headX = (mapRange(segmentProgress, 0, 1, from.x, to.x) + 0.5) * GRID_CELL_SIZE;
        const headY = (mapRange(segmentProgress, 0, 1, from.y, to.y) + 0.5) * GRID_CELL_SIZE;

        const headSize = 4;
        const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, headSize * 2);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(headX - headSize, headY - headSize, headSize * 2, headSize * 2);
    }
}

export class CPUTraceEffect implements VFXEffect {
    private components: BoardComponent[] = [];
    private traces: Trace[] = [];
    private obstacleGrid: number[][] = [];
    private penaltyGrid: number[][] = [];
    private gridWidth = 0;
    private gridHeight = 0;

    private settings: VFXSettings = CPUTraceEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 5.0;

    static effectName = "CPU Trace";
    static defaultSettings: VFXSettings = {
        nodeCount: 20,
        hue: 200,
        traceAngle: 90,
    };

    // A* pathfinding algorithm
    private aStar(startPin: Pin, endPin: Pin, obstacleGrid: number[][], penaltyGrid: number[][]): { x: number, y: number }[] | null {

        const getPathfindingEndpoint = (pin: Pin) => {
            let x = pin.x, y = pin.y;
            switch (pin.direction) {
                case 'n': y -= 1; break;
                case 's': y += 1; break;
                case 'w': x -= 1; break;
                case 'e': x += 1; break;
            }
            if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return null;
            return { x, y };
        };

        const startPos = getPathfindingEndpoint(startPin);
        const endPos = getPathfindingEndpoint(endPin);
        
        if (!startPos || !endPos) return null;

        const openList: PathNode[] = [];
        const closedList: boolean[][] = Array(this.gridWidth).fill(false).map(() => Array(this.gridHeight).fill(false));
        
        const startNode = new PathNode(startPos.x, startPos.y);
        const endNode = new PathNode(endPos.x, endPos.y);
        
        openList.push(startNode);
        
        while (openList.length > 0) {
            let lowestFIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[lowestFIndex].f) {
                    lowestFIndex = i;
                }
            }
            const currentNode = openList.splice(lowestFIndex, 1)[0];
            
            if (currentNode.x < 0 || currentNode.x >= this.gridWidth || currentNode.y < 0 || currentNode.y >= this.gridHeight) {
                continue;
            }

            closedList[currentNode.x][currentNode.y] = true;

            if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
                const path: { x: number, y: number }[] = [];
                let curr: PathNode | null = currentNode;
                while (curr) {
                    path.push({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                const finalPath = path.reverse();
                
                finalPath.unshift({ x: startPin.x, y: startPin.y });
                finalPath.push({ x: endPin.x, y: endPin.y });

                return finalPath;
            }

            const neighbors: { pos: { x: number, y: number }, cost: number }[] = [];
            const { x, y } = currentNode;
            
            // Cardinal directions
            if (x > 0) neighbors.push({ pos: { x: x - 1, y }, cost: 1 });
            if (x < this.gridWidth - 1) neighbors.push({ pos: { x: x + 1, y }, cost: 1 });
            if (y > 0) neighbors.push({ pos: { x, y: y - 1 }, cost: 1 });
            if (y < this.gridHeight - 1) neighbors.push({ pos: { x, y: y + 1 }, cost: 1 });

            // Diagonal directions
            if (this.settings.traceAngle === 45) {
                if (x > 0 && y > 0) neighbors.push({ pos: { x: x - 1, y: y - 1 }, cost: Math.SQRT2 });
                if (x < this.gridWidth - 1 && y > 0) neighbors.push({ pos: { x: x + 1, y: y - 1 }, cost: Math.SQRT2 });
                if (x > 0 && y < this.gridHeight - 1) neighbors.push({ pos: { x: x - 1, y: y + 1 }, cost: Math.SQRT2 });
                if (x < this.gridWidth - 1 && y < this.gridHeight - 1) neighbors.push({ pos: { x: x + 1, y: y + 1 }, cost: Math.SQRT2 });
            }

            for (const neighbor of neighbors) {
                const neighborPos = neighbor.pos;

                if (closedList[neighborPos.x][neighborPos.y] || obstacleGrid[neighborPos.x][neighborPos.y] === 1) {
                    continue;
                }
                
                const gScore = currentNode.g + neighbor.cost + penaltyGrid[neighborPos.x][neighborPos.y];
                
                const existingNode = openList.find(n => n.x === neighborPos.x && n.y === neighborPos.y);

                if (!existingNode) {
                    const neighborNode = new PathNode(neighborPos.x, neighborPos.y);
                    if (this.settings.traceAngle === 45) {
                        neighborNode.h = Math.sqrt(Math.pow(neighborPos.x - endNode.x, 2) + Math.pow(neighborPos.y - endNode.y, 2));
                    } else {
                        neighborNode.h = Math.abs(neighborPos.x - endNode.x) + Math.abs(neighborPos.y - endNode.y);
                    }
                    neighborNode.parent = currentNode;
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openList.push(neighborNode);

                } else if (gScore < existingNode.g) {
                    existingNode.parent = currentNode;
                    existingNode.g = gScore;
                    existingNode.f = existingNode.g + existingNode.h;
                }
            }
        }

        return null; // No path found
    }

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CPUTraceEffect.defaultSettings, ...settings };
        
        this.gridWidth = Math.floor(this.width / GRID_CELL_SIZE);
        this.gridHeight = Math.floor(this.height / GRID_CELL_SIZE);

        if (this.gridWidth < 15 || this.gridHeight < 15) {
            this.components = [];
            this.traces = [];
            return;
        }
        
        this.obstacleGrid = Array(this.gridWidth).fill(0).map(() => Array(this.gridHeight).fill(0));
        this.components = [];
        this.traces = [];

        // 1. Place CPU
        const cpuWidth = 8;
        const cpuHeight = 8;
        let cpuX = Math.floor(this.gridWidth / 2 - cpuWidth / 2);
        let cpuY = Math.floor(this.gridHeight / 2 - cpuHeight / 2);
        
        cpuX = Math.max(1, Math.min(cpuX, this.gridWidth - cpuWidth - 2));
        cpuY = Math.max(1, Math.min(cpuY, this.gridHeight - cpuHeight - 2));

        const cpu = new CPUComponent(cpuX, cpuY, cpuWidth, cpuHeight, 8);
        this.components.push(cpu);
        for (let i = 0; i < cpuWidth; i++) {
            for (let j = 0; j < cpuHeight; j++) {
                this.obstacleGrid[cpuX + i][cpuY + j] = 1; 
            }
        }

        // 2. Place ICs
        const nodeCount = this.settings.nodeCount as number;
        for (let i = 0; i < nodeCount; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const icWidth = Math.floor(seededRandom(i * attempts) * 5) + 2; 
                const icHeight = Math.floor(seededRandom(i * attempts + 1) * 7) + 3; 
                
                const maxX = this.gridWidth - icWidth - 2;
                const maxY = this.gridHeight - icHeight - 2;

                if (maxX <= 1 || maxY <= 1) { 
                    attempts++;
                    continue;
                }

                const icX = Math.floor(seededRandom(i * attempts + 2) * (maxX - 1)) + 1;
                const icY = Math.floor(seededRandom(i * attempts + 3) * (maxY - 1)) + 1;

                let overlaps = false;
                for (let x = icX - 1; x < icX + icWidth + 1; x++) {
                    for (let y = icY - 1; y < icY + icHeight + 1; y++) {
                         if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) continue;
                        if (this.obstacleGrid[x][y] === 1) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (overlaps) break;
                }

                if (!overlaps) {
                    const pinCount = Math.floor(seededRandom(i) * 5) + 4; // 4-8 pins
                    const ic = new ICComponent(icX, icY, icWidth, icHeight, pinCount);
                    this.components.push(ic);
                    for (let x = icX; x < icX + icWidth; x++) {
                        for (let y = icY; y < icY + icHeight; y++) {
                            this.obstacleGrid[x][y] = 1;
                        }
                    }
                    placed = true;
                }
                attempts++;
            }
        }
        
        // Create a penalty grid to discourage traces from hugging components
        this.penaltyGrid = Array(this.gridWidth).fill(0).map(() => Array(this.gridHeight).fill(0));
        const penalty = 2; // High cost for cells adjacent to obstacles
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.obstacleGrid[x][y] === 1) {
                    // Apply penalty to neighbors
                    for (let dx = -3; dx <= 3; dx++) {
                        for (let dy = -3; dy <= 3; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight && this.obstacleGrid[nx][ny] === 0) {
                                this.penaltyGrid[nx][ny] = penalty * (10-Math.abs(dx)-Math.abs(dy));
                            }
                        }
                    }
                }
            }
        }
        
        // 3. Create Traces
        const traceCount = nodeCount * 2;
        const allPins = this.components.flatMap(c => c.pins);

        for (let i = 0; i < traceCount; i++) {
            const comp1Index = Math.floor(seededRandom(i) * this.components.length);
            let comp2Index = Math.floor(seededRandom(i + 1) * this.components.length);
            if (comp1Index === comp2Index) {
                comp2Index = (comp1Index + 1) % this.components.length;
            }

            const comp1 = this.components[comp1Index];
            const comp2 = this.components[comp2Index];

            const pin1 = comp1.getFreePin();
            const pin2 = comp2.getFreePin();

            if (pin1 && pin2) {
                const pathfindingObstacleGrid = this.obstacleGrid.map(row => [...row]);

                allPins.forEach(p => {
                    if (p !== pin1 && p !== pin2) {
                        if (p.x >= 0 && p.x < this.gridWidth && p.y >= 0 && p.y < this.gridHeight) {
                            pathfindingObstacleGrid[p.x][p.y] = 1; // Mark other pins as obstacles
                        }
                    }
                });
                
                const path = this.aStar(pin1, pin2, pathfindingObstacleGrid, this.penaltyGrid);
                if (path) {
                    pin1.isOccupied = true;
                    pin2.isOccupied = true;
                    this.traces.push(new Trace(path, this.totalDuration, i));
                    
                    // Mark path as obstacle in the main grid for subsequent traces
                    path.forEach(p => {
                        if (this.obstacleGrid[p.x] && this.obstacleGrid[p.x][p.y] !== undefined && this.obstacleGrid[p.x][p.y] === 0) {
                            this.obstacleGrid[p.x][p.y] = 1;
                        }
                    });
                }
            }
        }
    }

    destroy() {
        this.components = [];
        this.traces = [];
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.nodeCount !== settings.nodeCount ||
            this.settings.traceAngle !== settings.traceAngle;

        this.settings = { ...CPUTraceEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;
        
        this.components.forEach(comp => comp.draw(ctx, this.settings));
        this.traces.forEach(trace => trace.draw(ctx, this.currentTime, this.settings));
    }

    getSettings(): VFXSettings {
        return this.settings;
    }
}
