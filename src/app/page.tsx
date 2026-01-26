"use client";

import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ControlPanel } from "@/components/control-panel";
import { EffectPlayer } from "@/components/effect-player";
import { type VFXEffectClass, type VFXSettings } from "@/effects/types";
import { MatrixEffect } from "@/effects/matrix";
import { HealingEffect } from "@/effects/healing";
import { LabLogo } from "@/components/icons";
import { cn } from "@/lib/utils";

const availableEffects: Record<string, VFXEffectClass> = {
  matrix: MatrixEffect,
  healing: HealingEffect,
};

const backgroundClasses: Record<string, string> = {
  default: "bg-background",
  checkerboard: "bg-checkerboard",
  light: "bg-white",
};

export default function Home() {
  const [effectKey, setEffectKey] = React.useState<string>("matrix");
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
    // Reset time when effect changes
    setTime(0);
  };

  const currentSettings = React.useMemo(() => ({
      ...CurrentEffect.defaultSettings,
      ...(settings[effectKey] || {}),
    }), [CurrentEffect, settings, effectKey]);

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
        <header className="flex items-center justify-between p-2 pl-4 border-b bg-sidebar-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <LabLogo className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold font-headline tracking-tight">
              VFX Lab
            </h1>
          </div>
          <SidebarTrigger />
        </header>
        <main className={cn("flex-1 relative bg-background overflow-hidden", backgroundClasses[background])}>
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
