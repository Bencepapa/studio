"use server";

import fs from "fs";
import path from "path";
import { generateDependencyInstructions } from "@/ai/flows/generate-dependency-instructions";

const effectFileMap: { [key: string]: string } = {
  "jack-in": "jack-in.ts",
  matrix: "matrix.ts",
  healing: "healing.ts",
  damage: "damage.ts",
  shield: "shield.ts",
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
