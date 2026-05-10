import fs from "node:fs/promises";
import { PROJECTS_DIR, decodeProjectName, pathExists } from "../paths";
import type { ProjectEntry } from "../types";

export async function listProjects(): Promise<ProjectEntry[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(PROJECTS_DIR);
  } catch {
    return [];
  }

  const results: ProjectEntry[] = [];
  for (const encoded of entries) {
    if (!encoded.startsWith("-")) continue;
    const decoded = await decodeProjectName(encoded);
    const exists = await pathExists(decoded);
    results.push({
      encoded,
      decoded,
      displayName: shortDisplay(decoded),
      exists,
    });
  }

  return results.sort((a, b) => {
    if (a.exists !== b.exists) return a.exists ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

function shortDisplay(absolute: string): string {
  const parts = absolute.split("/").filter(Boolean);
  if (parts.length <= 2) return absolute;
  return parts.slice(-2).join("/");
}
