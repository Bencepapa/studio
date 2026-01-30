
"use server";

import fs from "fs";
import path from "path";

const effectFileMap: { [key: string]: string } = {
  "drone-view": "drone-view.ts",
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

const UTILS_INSTRUCTIONS = `This effect relies on helper functions from a utility script.

1. **Copy the utility file:**
   Locate the file at \`src/effects/utils.ts\` in the VFX Lab project and copy it into your own project.

2. **Ensure correct import path:**
   Make sure the effect file can correctly import the utilities. For example, if you place both the effect file and \`utils.ts\` in the same directory, the import statement in the effect file should look like this:

   \`\`\`typescript
   import { seededRandom, mapRange, randomRange, lerp } from './utils';
   \`\`\`
`;

export async function generateDependenciesForEffect(effectKey: string) {
  const fileName = effectFileMap[effectKey];
  if (!fileName) {
    throw new Error("Invalid effect specified.");
  }

  const filePath = path.join(process.cwd(), "src", "effects", fileName);

  try {
    const effectCode = fs.readFileSync(filePath, "utf-8");

    // Simple analysis: check if 'utils.ts' is imported.
    if (effectCode.includes("from './utils'")) {
        return { instructions: UTILS_INSTRUCTIONS };
    }

    return { instructions: "No external script dependencies found for this effect." };

  } catch (error: any) {
    console.error("Error reading effect file:", error);
    if (error.code === 'ENOENT') {
      return { instructions: `Error: Effect file not found at ${filePath}.` };
    }
    return { instructions: "Could not analyze dependencies. Please check the server logs." };
  }
}
