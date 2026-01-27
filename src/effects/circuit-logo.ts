
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

// Data for letter shapes (1 = part of letter, 0 = empty)
const LETTER_SHAPES: { [key: string]: string[] } = {
    'M': ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    'A': [".11.", "1..1", "1..1", "1111", "1..1", "1..1", "1..1"],
    'T': ["11111", ".010.", ".010.", ".010.", ".010.", ".010.", ".010."],
    'R': ["1110", "1..1", "1..1", "1110", "1.1.", "1..1", "1..1"],
    'I': ["111", ".1.", ".1.", ".1.", ".1.", ".1.", "111"],
    'X': ["1...1", ".1.1.", "..1..", ".1.1.", "1...1", "1...1", "1...1"]
};

const CELL_SIZE = 10;

class PathNode {
    x: number; y: number; g = 0; h = 0; f = 0;
    parent: PathNode | null = null;
    constructor(x: number, y: number) { this.x = x; this.y = y; }
}

class Trace {
    path: { x: number, y: number }[];
    delay: number;
    duration: number;

    constructor(path: { x: number, y: number }[], totalDuration: number, seed: number) {
        this.path = path;
        this.duration = seededRandom(seed) * 1.5 + 1.0;
        this.delay = seededRandom(seed + 1) * (totalDuration - this.duration);
    }

    draw(ctx: CanvasRenderingContext2D, time: number, settings: VFXSettings, activatedCells: Map<string, number>) {
        const timeInCycle = time - this.delay;
        if (timeInCycle < 0 || timeInCycle > this.duration || this.path.length < 2) return;

        const progress = timeInCycle / this.duration;
        const headIndex = Math.floor(progress * (this.path.length - 1));
        const segmentProgress = (progress * (this.path.length - 1)) % 1;

        const from = this.path[headIndex];
        const to = this.path[headIndex + 1];
        if (!from || !to) return;
        
        // `from` coordinates are global grid coordinates.
        activatedCells.set(`${from.x},${from.y}`, 1.0);
        // Activate neighbors for a blooming effect
        const neighbors = [
            {x: from.x-1, y: from.y}, {x: from.x+1, y: from.y},
            {x: from.x, y: from.y-1}, {x: from.x, y: from.y+1},
            {x: from.x-1, y: from.y-1}, {x: from.x+1, y: from.y-1},
            {x: from.x-1, y: from.y+1}, {x: from.x+1, y: from.y+1},
        ];
        neighbors.forEach(n => {
            const key = `${n.x},${n.y}`;
            // Only set brightness if it's not already brighter. This prevents overwriting the main path.
            if (!activatedCells.has(key) || activatedCells.get(key)! < 0.5) {
                activatedCells.set(key, 0.5);
            }
        });
        
        // head coordinates are global pixel coordinates.
        const headX = mapRange(segmentProgress, 0, 1, from.x, to.x) * CELL_SIZE;
        const headY = mapRange(segmentProgress, 0, 1, from.y, to.y) * CELL_SIZE;

        const headSize = 3; // Make the head smaller and more subtle
        const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, headSize * 2);
        gradient.addColorStop(0, `hsla(0, 0%, 100%, 0.7)`); // Less intense white center
        gradient.addColorStop(0.5, `hsla(0, 0%, 90%, 0.3)`); // Fade quicker
        gradient.addColorStop(1, `hsla(0, 0%, 80%, 0)`); // Fully transparent

        ctx.fillStyle = gradient;
        ctx.fillRect(headX - headSize, headY - headSize, headSize * 2, headSize * 2);
    }
}

class Letter {
    char: string;
    grid: number[][];
    pins: { x: number, y: number }[] = [];
    gridWidth: number;
    gridHeight: number;
    xOffset: number;
    yOffset: number;

    constructor(char: string, xOffset: number, yOffset: number, pinCount: number, seed: number) {
        this.char = char;
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        const shape = LETTER_SHAPES[char] || [];
        this.gridHeight = shape.length;
        this.gridWidth = shape[0]?.length || 0;
        this.grid = shape.map(row => row.split('').map(c => (c === '1' ? 1 : 0)));
        this.createPins(pinCount, seed);
    }

    createPins(pinCount: number, seed: number) {
        const edges: {x: number, y: number}[] = [];
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if(this.grid[y][x] === 1) {
                    if(y === 0 || y === this.gridHeight - 1 || x === 0 || x === this.gridWidth - 1) {
                        edges.push({x, y});
                    } else { // Check neighbors for internal edges
                        if (x > 0 && this.grid[y][x-1] === 0) edges.push({x,y});
                        else if (x < this.gridWidth - 1 && this.grid[y][x+1] === 0) edges.push({x,y});
                        else if (y > 0 && this.grid[y-1][x] === 0) edges.push({x,y});
                        else if (y < this.gridHeight - 1 && this.grid[y+1][x] === 0) edges.push({x,y});
                    }
                }
            }
        }

        for(let i=0; i<pinCount; i++) {
            if(edges.length === 0) break;
            const index = Math.floor(seededRandom(seed + i) * edges.length);
            this.pins.push(edges.splice(index, 1)[0]);
        }
    }
    
    drawBase(ctx: CanvasRenderingContext2D, settings: VFXSettings) {
        const { hue } = settings;
        ctx.save();
        ctx.translate(this.xOffset, this.yOffset);

        // Draw base grid
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.fillStyle = `hsla(${hue}, 80%, 20%, 0.2)`;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        ctx.restore();
    }
}

export class CircuitLogoEffect implements VFXEffect {
    private letters: Letter[] = [];
    private traces: Trace[] = [];
    private boardGrid: number[][] = [];
    private activatedCells: Map<string, number> = new Map();

    private settings: VFXSettings = CircuitLogoEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;
    private totalDuration = 5.0;

    static effectName = "Circuit Logo";
    static defaultSettings: VFXSettings = {
        pinCount: 4,
        hue: 120,
        traceSpeed: 1.0,
        glowFactor: 2.0,
    };

    private aStar(start: { x: number; y: number; }, end: { x: number; y: number; }, grid: number[][]): { x: number; y: number; }[] | null {
        const gridWidth = grid.length;
        const gridHeight = grid[0].length;
        
        const openList: PathNode[] = [];
        const closedList: boolean[][] = Array.from({ length: gridWidth }, () => Array(gridHeight).fill(false));
        const startNode = new PathNode(start.x, start.y);
        openList.push(startNode);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f); // Inefficient, but works for this scale
            const currentNode = openList.shift()!;
            
            if(currentNode.x < 0 || currentNode.x >= gridWidth || currentNode.y < 0 || currentNode.y >= gridHeight) continue;
            
            closedList[currentNode.x][currentNode.y] = true;

            if (currentNode.x === end.x && currentNode.y === end.y) {
                let path: {x:number, y:number}[] = [];
                let curr: PathNode | null = currentNode;
                while (curr) { path.push({ x: curr.x, y: curr.y }); curr = curr.parent; }
                return path.reverse();
            }

            // Check neighbors
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = currentNode.x + dx;
                    const ny = currentNode.y + dy;

                    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
                    if (closedList[nx][ny] || grid[nx][ny] === 1) continue;

                    // Prevent cutting corners through obstacles
                    if (dx !== 0 && dy !== 0) {
                        if (grid[currentNode.x][ny] === 1 || grid[nx][currentNode.y] === 1) {
                            continue;
                        }
                    }
                    
                    const g = currentNode.g + Math.sqrt(dx*dx + dy*dy);
                    let neighbor = openList.find(n => n.x === nx && n.y === ny);

                    if (!neighbor) {
                        neighbor = new PathNode(nx, ny);
                        // Use Euclidean distance for heuristic with diagonal movement
                        neighbor.h = Math.sqrt(Math.pow(nx - end.x, 2) + Math.pow(ny - end.y, 2));
                        neighbor.g = g;
                        neighbor.f = g + neighbor.h;
                        neighbor.parent = currentNode;
                        openList.push(neighbor);
                    } else if (g < neighbor.g) {
                        neighbor.g = g;
                        neighbor.f = g + neighbor.h;
                        neighbor.parent = currentNode;
                    }
                }
            }
        }
        return null;
    }


    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...CircuitLogoEffect.defaultSettings, ...settings };
        this.letters = [];
        this.traces = [];
        this.activatedCells.clear();
        
        // --- Centering Logic ---
        const word = "MATRIX";
        const allLettersWidth = word.split('').reduce((acc, char) => {
            const shape = LETTER_SHAPES[char] || [];
            return acc + (shape[0]?.length || 0) * CELL_SIZE;
        }, 0) + (word.length - 1) * CELL_SIZE;

        const letterGridHeight = 7; // All letters are 7 cells high
        const allLettersHeight = letterGridHeight * CELL_SIZE;
        
        let currentX = (this.width - allLettersWidth) / 2;
        const yOffset = (this.height - allLettersHeight) / 2;

        word.split('').forEach((char, index) => {
            const letter = new Letter(char, currentX, yOffset, this.settings.pinCount as number, index);
            this.letters.push(letter);
            currentX += letter.gridWidth * CELL_SIZE + CELL_SIZE;
        });
        
        // --- Pathfinding Grid Setup ---
        const boardGridWidth = Math.floor(this.width / CELL_SIZE);
        const boardGridHeight = Math.floor(this.height / CELL_SIZE);
        this.boardGrid = Array.from({ length: boardGridWidth }, () => Array(boardGridHeight).fill(0));

        this.letters.forEach(letter => {
            const letterStartGridX = Math.floor(letter.xOffset / CELL_SIZE);
            const letterStartGridY = Math.floor(letter.yOffset / CELL_SIZE);
            for (let y = 0; y < letter.gridHeight; y++) {
                for (let x = 0; x < letter.gridWidth; x++) {
                    if (letter.grid[y][x] === 1) {
                        const boardX = letterStartGridX + x;
                        const boardY = letterStartGridY + y;
                        if (this.boardGrid[boardX] && this.boardGrid[boardX][boardY] !== undefined) {
                            this.boardGrid[boardX][boardY] = 1;
                        }
                    }
                }
            }
        });

        // --- Create Traces ---
        const allPins = this.letters.flatMap(l => l.pins.map(p => ({
            x: p.x + Math.floor(l.xOffset / CELL_SIZE),
            y: p.y + Math.floor(l.yOffset / CELL_SIZE)
        })));


        allPins.forEach((pin, i) => {
            let startX, startY;
            if (seededRandom(i * 10) > 0.5) {
                startX = Math.floor(seededRandom(i * 11) * boardGridWidth);
                startY = seededRandom(i * 12) > 0.5 ? 0 : boardGridHeight - 1;
            } else {
                startX = seededRandom(i * 13) > 0.5 ? 0 : boardGridWidth - 1;
                startY = Math.floor(seededRandom(i * 14) * boardGridHeight);
            }

            // Find a valid target point adjacent to the pin, which is not an obstacle
            let targetX = -1, targetY = -1;
            const directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}, {x:-1,y:-1}, {x:1,y:-1}, {x:-1,y:1}, {x:1,y:1}];
            
            for(const dir of directions) {
                const nx = pin.x + dir.x;
                const ny = pin.y + dir.y;
                if (nx >= 0 && nx < boardGridWidth && ny >= 0 && ny < boardGridHeight && this.boardGrid[nx][ny] === 0) {
                    targetX = nx;
                    targetY = ny;
                    break;
                }
            }
        
            if (targetX !== -1) {
                const path = this.aStar({ x: startX, y: startY }, { x: targetX, y: targetY }, this.boardGrid);
                if (path) {
                    // The path ends at the adjacent cell. Manually add the pin itself to the end.
                    path.push({x: pin.x, y: pin.y});
                    this.traces.push(new Trace(path, this.totalDuration, i));
                }
            }
        });
    }

    destroy() { 
        this.letters = [];
        this.traces = [];
        this.activatedCells.clear();
    }

    update(time: number, deltaTime: number, settings: VFXSettings) {
        const effectiveTime = time * (settings.traceSpeed as number);
        this.currentTime = effectiveTime % this.totalDuration;
        
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        const needsReinit =
            this.width !== rect.width ||
            this.height !== rect.height ||
            this.settings.pinCount !== settings.pinCount;

        this.settings = { ...CircuitLogoEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
            return;
        }

        // Decay activated cell brightness
        this.activatedCells.forEach((brightness, key) => {
            const newBrightness = brightness - deltaTime * 0.8; // Fade speed
            if (newBrightness <= 0) {
                this.activatedCells.delete(key);
            } else {
                this.activatedCells.set(key, newBrightness);
            }
        });
    }

    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        // 1. Draw the dim base shape of all letters
        this.letters.forEach(l => l.drawBase(ctx, this.settings));
        
        // 2. Draw the glowing activated cells
        const { hue, glowFactor } = this.settings;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.8)`;
        
        this.activatedCells.forEach((brightness, key) => {
            const [gridX, gridY] = key.split(',').map(Number);
            
            // Only draw glow if the cell is part of a letter
            if (this.boardGrid[gridX]?.[gridY] === 1) {
                const pixelX = gridX * CELL_SIZE;
                const pixelY = gridY * CELL_SIZE;
                
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${brightness})`;
                ctx.shadowBlur = brightness * 10 * (glowFactor as number);
                ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            }
        });
        ctx.shadowBlur = 0;

        // 3. Draw the moving trace heads (which also updates the activatedCells map)
        this.traces.forEach(trace => trace.draw(ctx, this.currentTime, this.settings, this.activatedCells));
    }

    getSettings() { return this.settings; }
}
