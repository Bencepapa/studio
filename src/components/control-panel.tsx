"use client";

import * as React from "react";
import {
  GitBranch,
  Play,
  Pause,
  Rewind,
  Settings2,
  FileText,
  Loader2,
  Layers,
} from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { VFXEffectClass, VFXSettings } from "@/effects/types";
import { generateDependenciesForEffect } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

interface ControlPanelProps {
  availableEffects: Record<string, VFXEffectClass>;
  effectKey: string;
  onEffectChange: (key: string) => void;
  isPlaying: boolean;
  onIsPlayingChange: (playing: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  time: number;
  onTimeChange: (time: number) => void;
  duration: number;
  settings: VFXSettings;
  onSettingsChange: (settings: Partial<VFXSettings>) => void;
  background: string;
  onBackgroundChange: (background: string) => void;
}

export function ControlPanel({
  availableEffects,
  effectKey,
  onEffectChange,
  isPlaying,
  onIsPlayingChange,
  speed,
  onSpeedChange,
  time,
  onTimeChange,
  duration,
  settings,
  onSettingsChange,
  background,
  onBackgroundChange,
}: ControlPanelProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [instructions, setInstructions] = React.useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = React.useState(0);

  React.useEffect(() => {
    const setWidth = () => setViewportWidth(window.innerWidth);
    setWidth();
    window.addEventListener("resize", setWidth);
    return () => window.removeEventListener("resize", setWidth);
  }, []);


  const handleGenerateInstructions = async () => {
    setIsGenerating(true);
    setInstructions(null);
    const result = await generateDependenciesForEffect(effectKey);
    setInstructions(result.instructions);
    setIsGenerating(false);
  };

  const renderSettingControl = (key: string, value: any) => {
    const label = key.replace(/([A-Z])/g, " $1");

    if (key === 'traceAngle' && effectKey === 'cpu-trace') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            Trace Angle
          </Label>
          <Select value={String(value)} onValueChange={(v) => onSettingsChange({ [key]: Number(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Select angle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90° (Orthogonal)</SelectItem>
              <SelectItem value="45">45° (Diagonal)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === 'ribbonTexture' && effectKey === 'levelup') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            Ribbon Texture
          </Label>
          <Select value={value} onValueChange={(v) => onSettingsChange({ [key]: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select texture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Solid">Solid</SelectItem>
              <SelectItem value="45° Dashed">45° Dashed</SelectItem>
              <SelectItem value="Dots">Dots</SelectItem>
              <SelectItem value="Hex Grid">Hex Grid</SelectItem>
              <SelectItem value="Horizontal Lines">Horizontal Lines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === 'body' || (effectKey === 'speech-bubble' && key === 'text')) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label}
          </Label>
          <Textarea
            id={key}
            value={value}
            onChange={(e) => onSettingsChange({ [key]: e.target.value })}
            className="h-32 font-code text-xs"
            placeholder="Enter message..."
          />
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label}
          </Label>
          <Switch
            id={key}
            checked={value}
            onCheckedChange={(v) => onSettingsChange({ [key]: v })}
          />
        </div>
      );
    }

    if (key.toLowerCase().includes("hue")) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label} ({value})
          </Label>
          <Slider
            id={key}
            min={0}
            max={360}
            step={1}
            value={[value]}
            onValueChange={([v]) => onSettingsChange({ [key]: v })}
          />
        </div>
      );
    }
    if (key.toLowerCase().includes("opacity")) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label} ({value.toFixed(2)})
          </Label>
          <Slider
            id={key}
            min={0}
            max={1}
            step={0.05}
            value={[value]}
            onValueChange={([v]) => onSettingsChange({ [key]: v })}
          />
        </div>
      );
    }
    if (typeof value === "string") {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label}
          </Label>
          <Input
            id={key}
            type="text"
            value={value}
            onChange={(e) => onSettingsChange({ [key]: e.target.value })}
          />
        </div>
      );
    }
    if (typeof value === "number") {
      const isSpeed = key.toLowerCase().includes('speed');
      const isCount = key.toLowerCase().includes('count');
      const isRibbonWidth = key === 'ribbonWidth';
      const isTarget = key === 'targetX' || key === 'targetY';
      const isCornerRadius = key === 'cornerRadius';
      const isDisplayDuration = key === 'displayDuration';

      const min = isSpeed ? -2 : 0;
      
      let max;
      if (isCount) {
        max = 1000;
      } else if (isSpeed) {
        max = 10;
      } else if (isRibbonWidth) {
        max = viewportWidth;
      } else if (isTarget) {
        max = 100;
      } else if (isCornerRadius) {
        max = 50;
      } else if (isDisplayDuration) {
        max = 10;
      }
      else {
        max = 200;
      }
      
      const step = isSpeed || isDisplayDuration ? 0.1 : (isCount || isRibbonWidth || isTarget || isCornerRadius ? 1 : 0.1);
      
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize text-xs">
            {label} ({value.toFixed(isSpeed ? 2 : (isDisplayDuration ? 1 : (isCount || isRibbonWidth || isTarget || isCornerRadius ? 0 : 1)))})
          </Label>
          <Slider
            id={key}
            min={min}
            max={max}
            step={step}
            value={[value]}
            onValueChange={([v]) => onSettingsChange({ [key]: v })}
          />
        </div>
      );
    }
    // Add more control types as needed
    return null;
  };

  return (
    <>
      <SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>
            <GitBranch />
            <span>Effect Library</span>
          </SidebarGroupLabel>
          <Select value={effectKey} onValueChange={onEffectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an effect" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableEffects).map(([key, effect]) => (
                <SelectItem key={key} value={key}>
                  {effect.effectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SidebarGroup>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Layers />
            <span>Background</span>
          </SidebarGroupLabel>
          <Select value={background} onValueChange={onBackgroundChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="checkerboard">Checkerboard</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="game-ui">Game UI</SelectItem>
              <SelectItem value="cyber-matrix">Cyber Matrix</SelectItem>
            </SelectContent>
          </Select>
        </SidebarGroup>
        
        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <Settings2 />
            <span>Controls</span>
          </SidebarGroupLabel>
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label htmlFor="timeline" className="text-xs">
                Timeline
              </Label>
              <Slider
                id="timeline"
                min={0}
                max={duration}
                step={0.1}
                value={[time]}
                onValueChange={([v]) => onTimeChange(v)}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTimeChange(0)}
                aria-label="Rewind to start"
              >
                <Rewind />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full border-accent text-accent"
                onClick={() => onIsPlayingChange(!isPlaying)}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause /> : <Play />}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speed" className="text-xs">
                Speed: {speed.toFixed(2)}x
              </Label>
              <Slider
                id="speed"
                min={-2}
                max={4}
                step={0.1}
                value={[speed]}
                onValueChange={([v]) => onSpeedChange(v)}
              />
            </div>
          </div>
        </SidebarGroup>
        
        <SidebarSeparator />

        <SidebarGroup>
           <SidebarGroupLabel>
            <Settings2 />
            <span>Parameters</span>
          </SidebarGroupLabel>
          <div className="space-y-4 p-2">
            {Object.entries(settings).map(([key, value]) => renderSettingControl(key, value))}
          </div>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleGenerateInstructions}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileText />
              )}
              <span>
                {isGenerating
                  ? "Generating..."
                  : "Get Dependencies"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <Dialog open={!!instructions} onOpenChange={(open) => !open && setInstructions(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dependency Instructions for {availableEffects[effectKey].effectName}</DialogTitle>
            <DialogDescription>
              Follow these instructions to include the necessary files in your project.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-md border p-4">
            <pre className="text-sm font-code whitespace-pre-wrap">
              <code>{instructions}</code>
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
