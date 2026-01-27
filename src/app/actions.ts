
"use server";

import fs from "fs";
import path from "path";
import { generateDependencyInstructions } from "@/ai/flows/generate-dependency-instructions";

const effectFileMap: { [key: string]: string } = {
  "circuit-logo": "circuit-logo.ts",
  "welcome": "welcome.ts",
  "game-menu": "game-menu.ts",
  "pc-startup": "pc-startup.ts",
  "arcade-startup": "arcade-startup.ts",
  "c64-startup": "c64-startup.ts",
  "linux-startup": "linux-startup.ts",
  "jack-in": "jack-in.ts",
  matrix: "matrix.ts",
  healing: "healing.ts",
  damage: "damage.ts",
  shield: "shield.ts",
  alert: "alert.ts",
  crash: "crash.ts",
  compiler: "compiler.ts",
  levelup: "levelup.ts",
  "red-alert": "red-alert.ts",
  scanner: "scanner.ts",
  "radar-scanner": "radar-scanner.ts",
  "cyber-grid": "cyber-grid.ts",
  "incoming-message": "incoming-message.ts",
  "fade-transition": "fade-transition.ts",
  "ribbon-transition": "ribbon-transition.ts",
  "cpu-trace": "cpu-trace.ts",
  "system-overload": "system-overload.ts",
  "cyberdeck-startup": "cyberdeck-startup.ts",
};

export async function generateDependenciesForEffect(effectKey: string) {
  const fileName = effectFileMap[effectKey];
  if (!fileName) {
    throw new Error("Invalid effect specified.");
  }

  const filePath = path.join(process.cwd(), "src", "effects", fileName);

  try {
    const effectCode = fs.readFileSync(filePath, "utf-8");
    const { instructions } = await generateDependencyInstructions({ effectCode });
    return { instructions: instructions || "No dependencies found." };
  } catch (error: any) {
    console.error("Error generating dependency instructions:", error);
    if (error.code === 'ENOENT') {
      return { instructions: `Error: Effect file not found at ${filePath}.` };
    }
    return { instructions: "Could not generate instructions. Please check the server logs." };
  }
}
