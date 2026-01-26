
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const GRID_CELL_SIZE = 10;

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
    isOccupied: boolean = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
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
        const pin = freePins[Math.floor(Math.random() * freePins.length)];
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
        ctx.fillStyle = `hsl(${hue}, 80%, 40%)`;
        this.pins.forEach(pin => {
            ctx.fillRect(pin.x * GRID_CELL_SIZE - 2, pin.y * GRID_CELL_SIZE - 2, 5, 5);
        });
    }
}

class CPUComponent extends BoardComponent {
    constructor(x: number, y: number, width: number, height: number, pinCountPerSide: number) {
        super(x, y, width, height);

        if (pinCountPerSide < 2) {
            // Handle case with 0 or 1 pin to avoid division by zero
            if (pinCountPerSide === 1) {
                const pinX = x + Math.floor(width / 2);
                const pinY = y + Math.floor(height / 2);
                this.pins.push(new Pin(pinX, y - 1));
                this.pins.push(new Pin(pinX, y + height));
                this.pins.push(new Pin(x - 1, pinY));
                this.pins.push(new Pin(x + width, pinY));
            }
            return;
        }
        
        const pinSpacingX = (width > 1) ? (width - 1) / (pinCountPerSide - 1) : 0;
        const pinSpacingY = (height > 1) ? (height - 1) / (pinCountPerSide - 1) : 0;

        // Top & Bottom pins
        for (let i = 0; i < pinCountPerSide; i++) {
            const pinX = x + Math.round(i * pinSpacingX);
            this.pins.push(new Pin(pinX, y - 1));
            this.pins.push(new Pin(pinX, y + height));
        }
        // Left & Right pins
        for (let i = 0; i < pinCountPerSide; i++) {
            const pinY = y + Math.round(i * pinSpacingY);
            this.pins.push(new Pin(x - 1, pinY));
            this.pins.push(new Pin(x + width, pinY));
        }
    }
}

class ICComponent extends BoardComponent {
    constructor(x: number, y: number, width: number, height: number, pinCountPerSide: number) {
        super(x, y, width, height);

        if (pinCountPerSide < 2) {
             // Handle case with 0 or 1 pin
            if (pinCountPerSide === 1) {
                if (height > width) { // vertical
                    const pinY = y + Math.floor(height/2);
                    this.pins.push(new Pin(x - 1, pinY));
                    this.pins.push(new Pin(x + width, pinY));
                } else { // horizontal
                    const pinX = x + Math.floor(width/2);
                    this.pins.push(new Pin(pinX, y - 1));
                    this.pins.push(new Pin(pinX, y + height));
                }
            }
            return;
        }

        const isVertical = height > width;
        if (isVertical) {
            const pinSpacing = (height > 1) ? (height - 1) / (pinCountPerSide - 1) : 0;
            for (let i = 0; i < pinCountPerSide; i++) {
                const pinY = y + Math.round(i * pinSpacing);
                this.pins.push(new Pin(x - 1, pinY));
                this.pins.push(new Pin(x + width, pinY));
            }
        } else {
            const pinSpacing = (width > 1) ? (width - 1) / (pinCountPerSide - 1) : 0;
            for (let i = 0; i < pinCountPerSide; i++) {
                const pinX = x + Math.round(i * pinSpacing);
                this.pins.push(new Pin(pinX, y - 1));
                this.pins.push(new Pin(pinX, y + height));
            }
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
        ctx.moveTo(this.path[0].x * GRID_CELL_SIZE, this.path[0].y * GRID_CELL_SIZE);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x * GRID_CELL_SIZE, this.path[i].y * GRID_CELL_SIZE);
        }
        ctx.stroke();

        // Draw moving head
        const headIndex = Math.floor(progress * (this.pathLength - 1));
        const segmentProgress = (progress * (this.pathLength - 1)) % 1;
        
        const from = this.path[headIndex];
        const to = this.path[headIndex + 1];

        if (!from || !to) return;

        const headX = mapRange(segmentProgress, 0, 1, from.x, to.x) * GRID_CELL_SIZE;
        const headY = mapRange(segmentProgress, 0, 1, from.y, to.y) * GRID_CELL_SIZE;

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
    private grid: number[][] = [];
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
    };

    // A* pathfinding algorithm
    private aStar(startPos: { x: number, y: number }, endPos: { x: number, y: number }): { x: number, y: number }[] | null {
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
                return path.reverse();
            }

            const neighbors = [];
            const { x, y } = currentNode;
            if (x > 0) neighbors.push({ x: x - 1, y });
            if (x < this.gridWidth - 1) neighbors.push({ x: x + 1, y });
            if (y > 0) neighbors.push({ x, y: y - 1 });
            if (y < this.gridHeight - 1) neighbors.push({ x, y: y + 1 });

            for (const neighborPos of neighbors) {
                if (closedList[neighborPos.x][neighborPos.y] || this.grid[neighborPos.x][neighborPos.y] === 1) {
                    continue;
                }
                
                const gScore = currentNode.g + 1;
                let gScoreIsBest = false;
                
                const neighborNode = new PathNode(neighborPos.x, neighborPos.y);
                const existingNode = openList.find(n => n.x === neighborPos.x && n.y === neighborPos.y);

                if (!existingNode) {
                    gScoreIsBest = true;
                    neighborNode.h = Math.abs(neighborPos.x - endNode.x) + Math.abs(neighborPos.y - endNode.y);
                    openList.push(neighborNode);
                } else if (gScore < existingNode.g) {
                    gScoreIsBest = true;
                }

                if (gScoreIsBest) {
                    (existingNode || neighborNode).parent = currentNode;
                    (existingNode || neighborNode).g = gScore;
                    (existingNode || neighborNode).f = (existingNode || neighborNode).g + (existingNode || neighborNode).h;
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
            // Grid too small, don't render anything
            this.components = [];
            this.traces = [];
            return;
        }
        
        this.grid = Array(this.gridWidth).fill(0).map(() => Array(this.gridHeight).fill(0));
        this.components = [];
        this.traces = [];

        // 1. Place CPU
        const cpuWidth = 8;
        const cpuHeight = 8;
        let cpuX = Math.floor(this.gridWidth / 2 - cpuWidth / 2);
        let cpuY = Math.floor(this.gridHeight / 2 - cpuHeight / 2);

        // Clamp to ensure there's a 1-cell border for pins
        cpuX = Math.max(1, Math.min(cpuX, this.gridWidth - cpuWidth - 1));
        cpuY = Math.max(1, Math.min(cpuY, this.gridHeight - cpuHeight - 1));

        const cpu = new CPUComponent(cpuX, cpuY, cpuWidth, cpuHeight, 4);
        this.components.push(cpu);
        for (let i = 0; i < cpuWidth; i++) {
            for (let j = 0; j < cpuHeight; j++) {
                this.grid[cpuX + i][cpuY + j] = 1; // Mark as obstacle
            }
        }

        // 2. Place ICs
        const nodeCount = this.settings.nodeCount as number;
        for (let i = 0; i < nodeCount; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const icWidth = Math.floor(seededRandom(i * attempts) * 5) + 2; // 2-6 cells wide
                const icHeight = Math.floor(seededRandom(i * attempts + 1) * 7) + 3; // 3-9 cells tall
                
                // Ensure there's space for component and 1-cell pin border
                const maxX = this.gridWidth - icWidth - 1;
                const maxY = this.gridHeight - icHeight - 1;

                if (maxX <= 1 || maxY <= 1) { // Not enough space on the grid for this IC
                    attempts++;
                    continue;
                }

                const icX = Math.floor(seededRandom(i * attempts + 2) * (maxX - 1)) + 1;
                const icY = Math.floor(seededRandom(i * attempts + 3) * (maxY - 1)) + 1;

                let overlaps = false;
                // check a slightly larger area to ensure spacing between components
                for (let x = icX - 1; x < icX + icWidth + 1; x++) {
                    for (let y = icY - 1; y < icY + icHeight + 1; y++) {
                         if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) continue;
                        if (this.grid[x][y] === 1) {
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
                            this.grid[x][y] = 1;
                        }
                    }
                    placed = true;
                }
                attempts++;
            }
        }
        
        // 3. Create Traces
        const traceGrid = this.grid.map(row => [...row]);
        const traceCount = nodeCount * 1.5;
        for (let i = 0; i < traceCount; i++) {
            const comp1Index = Math.floor(seededRandom(i) * this.components.length);
            let comp2Index = Math.floor(seededRandom(i + 1) * this.components.length);
            if(comp1Index === comp2Index) {
                comp2Index = (comp1Index + 1) % this.components.length;
            }

            const comp1 = this.components[comp1Index];
            const comp2 = this.components[comp2Index];

            const pin1 = comp1.getFreePin();
            const pin2 = comp2.getFreePin();

            if (pin1 && pin2) {
                const path = this.aStar({x: pin1.x, y: pin1.y}, {x: pin2.x, y: pin2.y});
                if(path) {
                    pin1.isOccupied = true;
                    pin2.isOccupied = true;
                    this.traces.push(new Trace(path, this.totalDuration, i));
                    // Mark path as obstacle for next trace
                    path.forEach(p => {
                        if (traceGrid[p.x][p.y] === 0) { // Don't overwrite components
                            traceGrid[p.x][p.y] = 1;
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
            this.settings.nodeCount !== settings.nodeCount;

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
