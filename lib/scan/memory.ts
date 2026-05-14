import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { PROJECTS_DIR, encodeProjectPath } from "../paths";
import type { Memory } from "../types";

const VALID_TYPES = new Set(["user", "feedback", "project", "reference"]);
const PREVIEW_CHARS = 300;

function toMemoryType(raw: unknown): Memory["memoryType"] {
  if (typeof raw === "string" && VALID_TYPES.has(raw)) {
    return raw as Memory["memoryType"];
  }
  return "reference";
}

async function parseMemoryFile(filePath: string): Promise<Memory | null> {
  try {
    const stat = await fs.stat(filePath);
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as { name?: string; description?: string; type?: unknown };

    const basename = path.basename(filePath, ".md");
    const isIndex = path.basename(filePath) === "MEMORY.md";

    return {
      name: typeof data.name === "string" ? data.name : basename,
      description: typeof data.description === "string" ? data.description : "",
      memoryType: toMemoryType(data.type),
      path: filePath,
      id: basename,
      mtime: stat.mtime.toISOString(),
      preview: parsed.content.slice(0, PREVIEW_CHARS),
      isIndex,
    };
  } catch {
    return null;
  }
}

export async function scanMemory(projectAbsolute: string): Promise<Memory[]> {
  const encoded = encodeProjectPath(projectAbsolute);
  const memoryDir = path.join(PROJECTS_DIR, encoded, "memory");

  let files: string[];
  try {
    files = await fs.readdir(memoryDir);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
  const results = await Promise.all(
    mdFiles.map((f) => parseMemoryFile(path.join(memoryDir, f))),
  );

  return results.filter((m): m is Memory => m !== null);
}
