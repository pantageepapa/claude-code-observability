import fs from "node:fs/promises";
import path from "node:path";
import { CLAUDE_DIR, RULES_DIR, tildify, ancestorDirs, HOME } from "../paths";
import type { ClaudeMdEntry } from "../types";

const PREVIEW_CHARS = 500;

async function readEntry(
  filePath: string,
  scope: ClaudeMdEntry["scope"],
  label: string,
): Promise<ClaudeMdEntry> {
  try {
    const stat = await fs.stat(filePath);
    const body = await fs.readFile(filePath, "utf-8");
    return {
      path: filePath,
      displayPath: tildify(filePath),
      scope,
      exists: true,
      sizeBytes: stat.size,
      mtime: stat.mtime.toISOString(),
      preview: body.slice(0, PREVIEW_CHARS),
      label,
    };
  } catch {
    return {
      path: filePath,
      displayPath: tildify(filePath),
      scope,
      exists: false,
      sizeBytes: 0,
      mtime: null,
      preview: "",
      label,
    };
  }
}

export async function scanClaudeMd(projectAbsolute: string): Promise<ClaudeMdEntry[]> {
  const entries: ClaudeMdEntry[] = [];

  // 1. Global CLAUDE.md
  entries.push(await readEntry(path.join(CLAUDE_DIR, "CLAUDE.md"), "user", "Global CLAUDE.md"));

  // 2. Global rules/*.md
  try {
    const ruleFiles = (await fs.readdir(RULES_DIR))
      .filter((f) => f.endsWith(".md"))
      .sort();
    for (const f of ruleFiles) {
      entries.push(await readEntry(path.join(RULES_DIR, f), "user", `Rule: ${f.replace(/\.md$/, "")}`));
    }
  } catch {
    // rules dir doesn't exist; skip
  }

  // 3. Walk up from project dir to HOME, collecting CLAUDE.md and .claude/CLAUDE.md
  //    at each ancestor. This matches how Claude Code actually resolves project config.
  for (const dir of ancestorDirs(projectAbsolute)) {
    if (dir === HOME || dir === CLAUDE_DIR) continue;
    const rel = tildify(dir);
    entries.push(
      await readEntry(path.join(dir, "CLAUDE.md"), "project", `${rel}/CLAUDE.md`),
    );
    entries.push(
      await readEntry(
        path.join(dir, ".claude", "CLAUDE.md"),
        "project",
        `${rel}/.claude/CLAUDE.md`,
      ),
    );
  }

  // Drop non-existent project entries to keep the panel tidy.
  return entries.filter((e) => e.exists || e.scope === "user");
}
