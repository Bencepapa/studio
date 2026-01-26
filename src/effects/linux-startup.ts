
import { seededRandom, mapRange } from './utils';
import type { VFXEffect, VFXEffectClass, VFXSettings } from './types';

const logMessages = [
    'Starting kernel ...',
    'Loading initial ramdisk ...',
    'systemd-journald.service: Done.',
    'dev-hugepages.mount: Done.',
    'sys-kernel-config.mount: Done.',
    'systemd-modules-load.service: Done.',
    'ldconfig.service: Done.',
    'Applying kernel settings ...',
    'systemd-sysctl.service: Done.',
    'systemd-tmpfiles-setup.service: Done.',
    'Activating swap ...',
    'dev-zram0.swap: Done.',
    'Detecting hardware ...',
    'GPU driver... OK',
    'Network interface... OK',
    'Input devices... OK',
    'Mounting /dev/nvme0n1p2 on / ...',
    'fsckd-cancel-msg: Starting.',
    'File System Check... OK',
    'systemd-binfmt.service: Done.',
    'Starting system logger... OK',
    'systemd-journal-gatewayd.socket: Done.',
    'Starting network daemon...',
    'network-manager.service: OK',
    'Starting display manager...',
    'gdm.service: FAILED', // Example failure
    'Retrying display manager... OK',
    'Loading user session...',
    'gnome-shell: OK',
    'Welcome to VFX OS!',
];

interface LogLine {
    text: string;
    status: 'OK' | 'FAILED' | 'NONE';
    appearTime: number;
}

export class LinuxStartupEffect implements VFXEffect {
    private settings: VFXSettings = LinuxStartupEffect.defaultSettings;
    private canvas: HTMLCanvasElement | null = null;
    private width = 0;
    private height = 0;
    private currentTime = 0;

    private logLines: LogLine[] = [];
    private totalDuration = 10.0;

    static effectName = "Linux Startup";
    static defaultSettings: VFXSettings = {
        successHue: 120, // Green
        errorHue: 0,     // Red
        defaultHue: 200, // Light Blue
        typingSpeed: 150, // chars per second
    };

    init(canvas: HTMLCanvasElement, settings: VFXSettings) {
        this.canvas = canvas;
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.width === 0 || this.height === 0) return;

        this.settings = { ...LinuxStartupEffect.defaultSettings, ...settings };
        
        this.logLines = [];
        let time = 0.5;
        const timeStep = 0.1;
        
        logMessages.forEach((msg, index) => {
            let status: 'OK' | 'FAILED' | 'NONE' = 'NONE';
            let text = msg;
            
            if (msg.includes('... OK')) {
                status = 'OK';
                text = msg.replace('... OK', '');
            } else if (msg.includes('... FAILED')) {
                status = 'FAILED';
                text = msg.replace('... FAILED', '');
            } else if (msg.endsWith(': Done.')) {
                 status = 'OK';
                 text = msg.replace(': Done.', '');
            } else if (msg.endsWith(': OK')) {
                 status = 'OK';
                 text = msg.replace(': OK', '');
            } else if (msg.endsWith(': FAILED')) {
                 status = 'FAILED';
                 text = msg.replace(': FAILED', '');
            }

            const lineDuration = (text.length / (this.settings.typingSpeed as number)) + timeStep;
            this.logLines.push({ text, status, appearTime: time });
            time += lineDuration;
        });

        this.totalDuration = time + 2.0; // Add 2 seconds at the end
    }

    destroy() {}

    update(time: number, deltaTime: number, settings: VFXSettings) {
        this.currentTime = time % this.totalDuration;

        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const needsReinit = this.width !== rect.width || this.height !== rect.height;
        
        this.settings = { ...LinuxStartupEffect.defaultSettings, ...settings };

        if (needsReinit) {
            this.init(this.canvas, this.settings);
        }
    }
    
    drawPenguinLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hue: number) {
        ctx.fillStyle = `hsl(${hue}, 20%, 80%)`;
        const s = size; // pixel size
        // A very simple abstract penguin-like logo
        // Body
        ctx.fillRect(x + s*2, y, s*4, s);
        ctx.fillRect(x + s, y+s, s*6, s*5);
        ctx.fillRect(x, y+s*2, s, s*2);
        ctx.fillRect(x + s*7, y+s*2, s, s*2);
        // Feet
        ctx.fillRect(x + s, y + s*6, s*2, s);
        ctx.fillRect(x + s*5, y + s*6, s*2, s);

        // Eyes (yellow)
        ctx.fillStyle = `hsl(60, 90%, 60%)`;
        ctx.fillRect(x + s*3, y + s*2, s, s);
        ctx.fillRect(x + s*5, y + s*2, s, s);
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (!this.width || !this.height) return;

        const { successHue, errorHue, defaultHue, typingSpeed } = this.settings;
        const timeInCycle = this.currentTime;

        // Background
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.width, this.height);

        // Text color and font
        const fontSize = Math.min(this.width, this.height) / 45;
        ctx.font = `${fontSize}px "Source Code Pro", monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Draw Header
        const headerY = this.height * 0.05;
        const logoX = this.width * 0.05;
        const logoPixelSize = Math.min(this.width, this.height) / 250;
        this.drawPenguinLogo(ctx, logoX, headerY, logoPixelSize, defaultHue as number);

        const headerTextX = logoX + logoPixelSize * 10;
        ctx.fillStyle = `hsl(${defaultHue as number}, 60%, 80%)`;
        ctx.fillText('VFX OS (Kernel 6.8.9-vfx)', headerTextX, headerY);
        ctx.fillText('MEM: 65536MB  |  HDD: 4096GB NVMe', headerTextX, headerY + fontSize * 1.2);
        
        // Draw Log Lines
        const logStartY = headerY + fontSize * 3;
        let currentY = logStartY;
        const lineHeight = fontSize * 1.2;
        const statusColumnX = this.width * 0.8;
        const maxLines = Math.floor((this.height - logStartY) / lineHeight);
        let scrollOffset = 0;

        const visibleLines = this.logLines.filter(line => timeInCycle >= line.appearTime);
        
        if (visibleLines.length > maxLines) {
            const linesToScroll = visibleLines.length - maxLines;
            const lastLine = visibleLines[visibleLines.length-1];
            const timeSinceLastLineStarted = timeInCycle - lastLine.appearTime;
            const lastLineTypingDuration = lastLine.text.length / (typingSpeed as number);

            if (timeSinceLastLineStarted > lastLineTypingDuration) {
                 scrollOffset = linesToScroll * lineHeight;
            } else {
                 scrollOffset = (linesToScroll - 1) * lineHeight;
                 const scrollProgress = timeSinceLastLineStarted / lastLineTypingDuration;
                 scrollOffset += lineHeight * scrollProgress;
            }
        }
        
        ctx.save();
        ctx.rect(0, logStartY, this.width, this.height - logStartY);
        ctx.clip();
        
        visibleLines.forEach(line => {
            const yPos = currentY - scrollOffset;

            // Typing effect for the text
            const timeSinceAppear = timeInCycle - line.appearTime;
            const charsToShow = Math.floor(timeSinceAppear * (typingSpeed as number));
            const textToDraw = line.text.substring(0, charsToShow);

            ctx.fillStyle = `hsl(${defaultHue as number}, 30%, 70%)`;
            ctx.fillText(`[ ${line.appearTime.toFixed(4)} ] ${textToDraw}`, this.width * 0.05, yPos);

            // Draw status after text is fully typed
            if (line.status !== 'NONE' && timeSinceAppear > (line.text.length / (typingSpeed as number))) {
                 ctx.fillText('[', statusColumnX, yPos);
                 if (line.status === 'OK') {
                    ctx.fillStyle = `hsl(${successHue as number}, 70%, 60%)`;
                    ctx.fillText('  OK  ', statusColumnX + fontSize, yPos);
                 } else {
                    ctx.fillStyle = `hsl(${errorHue as number}, 70%, 60%)`;
                    ctx.fillText('FAILED', statusColumnX + fontSize, yPos);
                 }
                 ctx.fillStyle = `hsl(${defaultHue as number}, 30%, 70%)`;
                 ctx.fillText(']', statusColumnX + fontSize*5.5, yPos);
            }
            currentY += lineHeight;
        });

        ctx.restore();
    }
    
    getSettings(): VFXSettings {
        return this.settings;
    }
}
