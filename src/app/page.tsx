
"use client";

import * as React from "react";
import Image from "next/image";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ControlPanel } from "@/components/control-panel";
import { EffectPlayer } from "@/components/effect-player";
import { type VFXEffectClass, type VFXSettings } from "@/effects/types";
import { DataCubesEffect } from "@/effects/data-cubes";
import { MatrixEffect } from "@/effects/matrix";
import { HealingEffect } from "@/effects/healing";
import { JackInEffect } from "@/effects/jack-in";
import { DamageEffect } from "@/effects/damage";
import { ShieldEffect } from "@/effects/shield";
import { AlertEffect } from "@/effects/alert";
import { CrashEffect } from "@/effects/crash";
import { CompilerEffect } from "@/effects/compiler";
import { LevelUpEffect } from "@/effects/levelup";
import { RedAlertEffect } from "@/effects/red-alert";
import { ScannerEffect } from "@/effects/scanner";
import { RadarScannerEffect } from "@/effects/radar-scanner";
import { CyberGridEffect } from "@/effects/cyber-grid";
import { IncomingMessageEffect } from "@/effects/incoming-message";
import { FadeTransitionEffect } from "@/effects/fade-transition";
import { RibbonTransitionEffect } from "@/effects/ribbon-transition";
import { C64StartupEffect } from "@/effects/c64-startup";
import { ArcadeStartupEffect } from "@/effects/arcade-startup";
import { PCStartupEffect } from "@/effects/pc-startup";
import { LinuxStartupEffect } from "@/effects/linux-startup";
import { CPUTraceEffect } from "@/effects/cpu-trace";
import { SystemOverloadEffect } from "@/effects/system-overload";
import { SpeechBubbleEffect } from "@/effects/speech-bubble";
import { CyberdeckStartupEffect } from "@/effects/cyberdeck-startup";
import { GameMenuEffect } from "@/effects/game-menu";
import { CircuitLogoEffect } from "@/effects/circuit-logo";
import { LabLogo } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { GameUiBackground } from "@/components/game-ui-background";
import { WelcomeEffect } from "@/effects/welcome";

const availableEffects: Record<string, VFXEffectClass> = {
  "cpu-trace": CPUTraceEffect,
  "circuit-logo": CircuitLogoEffect,
  "welcome": WelcomeEffect,
  "game-menu": GameMenuEffect,
  "cyberdeck-startup": CyberdeckStartupEffect,
  "data-cubes": DataCubesEffect,
  "system-overload": SystemOverloadEffect,
  "speech-bubble": SpeechBubbleEffect,
  "pc-startup": PCStartupEffect,
  "arcade-startup": ArcadeStartupEffect,
  "c64-startup": C64StartupEffect,
  "linux-startup": LinuxStartupEffect,
  levelup: LevelUpEffect,
  "ribbon-transition": RibbonTransitionEffect,
  "fade-transition": FadeTransitionEffect,
  "incoming-message": IncomingMessageEffect,
  "cyber-grid": CyberGridEffect,
  "jack-in": JackInEffect,
  matrix: MatrixEffect,
  healing: HealingEffect,
  damage: DamageEffect,
  shield: ShieldEffect,
  alert: AlertEffect,
  crash: CrashEffect,
  compiler: CompilerEffect,
  "red-alert": RedAlertEffect,
  scanner: ScannerEffect,
  "radar-scanner": RadarScannerEffect,
};

const backgroundClasses: Record<string, string> = {
  default: "bg-background",
  checkerboard: "bg-checkerboard",
  light: "bg-white",
  'game-ui': "bg-background",
  'cyber-matrix': "bg-background",
};

export default function Home() {
  const [effectKey, setEffectKey] = React.useState<string>("circuit-logo");
  const [isPlaying, setIsPlaying] = React.useState<boolean>(true);
  const [speed, setSpeed] = React.useState<number>(1);
  const [time, setTime] = React.useState<number>(0);
  const [duration] = React.useState<number>(30); // 30-second loop
  const [settings, setSettings] = React.useState<VFXSettings>({});
  const [background, setBackground] = React.useState<string>("default");

  const CurrentEffect = availableEffects[effectKey];

  const handleSettingsChange = (newSettings: Partial<VFXSettings>) => {
    setSettings((prev) => ({
      ...prev,
      [effectKey]: { ...prev[effectKey], ...newSettings },
    }));
  };

  const handleEffectChange = (newEffectKey: string) => {
    setEffectKey(newEffectKey);
    // Reset time and speed when effect changes
    setTime(0);
    if (speed < 0) {
      setSpeed(1);
    }
  };

  const effectKeys = Object.keys(availableEffects);
  const currentIndex = effectKeys.indexOf(effectKey);

  const handlePrevEffect = () => {
    const prevIndex = (currentIndex - 1 + effectKeys.length) % effectKeys.length;
    handleEffectChange(effectKeys[prevIndex]);
  };

  const handleNextEffect = () => {
    const nextIndex = (currentIndex + 1) % effectKeys.length;
    handleEffectChange(effectKeys[nextIndex]);
  };


  const currentSettings = React.useMemo(() => ({
      ...CurrentEffect.defaultSettings,
      ...(settings[effectKey] || {}),
    }), [CurrentEffect, settings, effectKey]);

  const cyberMatrixBg = PlaceHolderImages.find(img => img.id === 'cyber-matrix-background');

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        <ControlPanel
          availableEffects={availableEffects}
          effectKey={effectKey}
          onEffectChange={handleEffectChange}
          isPlaying={isPlaying}
          onIsPlayingChange={setIsPlaying}
          speed={speed}
          onSpeedChange={setSpeed}
          time={time}
          onTimeChange={setTime}
          duration={duration}
          settings={currentSettings}
          onSettingsChange={handleSettingsChange}
          background={background}
          onBackgroundChange={setBackground}
        />
      </Sidebar>
      <SidebarInset className="flex flex-col !m-0 !rounded-none min-h-screen">
        <header className="grid grid-cols-3 items-center p-2 pl-4 border-b bg-sidebar-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <LabLogo className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold font-headline tracking-tight">
              VFX Lab
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevEffect} className="h-7 w-7">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm w-32 text-center truncate">{CurrentEffect.effectName}</span>
            <Button variant="ghost" size="icon" onClick={handleNextEffect} className="h-7 w-7">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex justify-end">
            <SidebarTrigger />
          </div>
        </header>
        <main className={cn("flex-1 relative bg-background overflow-hidden", backgroundClasses[background])}>
          {background === 'game-ui' && <GameUiBackground />}
          {background === 'cyber-matrix' && cyberMatrixBg && (
            <Image
              src={cyberMatrixBg.imageUrl}
              alt={cyberMatrixBg.description}
              fill
              className="object-cover"
              data-ai-hint={cyberMatrixBg.imageHint}
            />
          )}
          <EffectPlayer
            key={effectKey}
            effect={CurrentEffect}
            isPlaying={isPlaying}
            speed={speed}
            time={time}
            onTimeUpdate={setTime}
            duration={duration}
            settings={currentSettings}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
