import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { CLAUDE_DIR, SKILLS_DIR, PLUGINS_CACHE, HOME, tildify, ancestorDirs } from "../paths";
import type { Skill } from "../types";

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

interface ParsedSkill {
  name: string;
  description: string;
}

async function parseSkillMd(skillMdPath: string, fallbackName: string): Promise<ParsedSkill | null> {
  try {
    const raw = await fs.readFile(skillMdPath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as { name?: string; description?: string };
    return {
      name: typeof data.name === "string" ? data.name : fallbackName,
      description: typeof data.description === "string" ? data.description : "",
    };
  } catch {
    return null;
  }
}

async function readSkillsInDir(
  baseDir: string,
  scope: Skill["scope"],
  source: Skill["source"],
  pluginName?: string,
): Promise<Skill[]> {
  const out: Skill[] = [];
  const names = await safeReaddir(baseDir);
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const dir = path.join(baseDir, name);
    let stat;
    try {
      stat = await fs.lstat(dir);
    } catch {
      continue;
    }
    if (!stat.isDirectory() && !stat.isSymbolicLink()) continue;

    const skillMdPath = path.join(dir, "SKILL.md");
    const parsed = await parseSkillMd(skillMdPath, name);
    if (!parsed) continue;

    let symlinkTarget: string | undefined;
    let resolvedSource = source;
    if (stat.isSymbolicLink()) {
      try {
        const realDir = await fs.realpath(dir);
        if (realDir !== dir) {
          symlinkTarget = tildify(realDir);
          if (source === "user") resolvedSource = "symlink";
        }
      } catch {
        // ignore
      }
    }

    out.push({
      name: parsed.name,
      description: parsed.description,
      scope,
      source: resolvedSource,
      pluginName,
      symlinkTarget,
      path: dir,
    });
  }
  return out;
}

async function scanPluginSkills(): Promise<Skill[]> {
  const all: Skill[] = [];
  // Plugin cache layout: <PLUGINS_CACHE>/<marketplace>/<plugin>/<version>/skills/<skill>/SKILL.md
  const marketplaces = await safeReaddir(PLUGINS_CACHE);
  for (const market of marketplaces) {
    const marketDir = path.join(PLUGINS_CACHE, market);
    const plugins = await safeReaddir(marketDir);
    for (const plugin of plugins) {
      const pluginDir = path.join(marketDir, plugin);
      const versions = await safeReaddir(pluginDir);
      for (const version of versions) {
        const skillsDir = path.join(pluginDir, version, "skills");
        try {
          const stat = await fs.stat(skillsDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        const skills = await readSkillsInDir(skillsDir, "user", "plugin", `${plugin}@${market}`);
        all.push(...skills);
      }
    }
  }
  return all;
}

async function scanProjectAncestorSkills(projectAbsolute: string): Promise<Skill[]> {
  const all: Skill[] = [];
  for (const dir of ancestorDirs(projectAbsolute)) {
    if (dir === HOME || dir === CLAUDE_DIR) continue;
    const skillsDir = path.join(dir, ".claude", "skills");
    const skills = await readSkillsInDir(skillsDir, "project", "project");
    all.push(...skills);
  }
  return all;
}

export async function scanSkills(projectAbsolute: string): Promise<Skill[]> {
  const [userSkills, pluginSkills, projectSkills] = await Promise.all([
    readSkillsInDir(SKILLS_DIR, "user", "user"),
    scanPluginSkills(),
    scanProjectAncestorSkills(projectAbsolute),
  ]);

  // Deduplicate by name within scope. Within project ancestors, the closest
  // ancestor (encountered first in scanProjectAncestorSkills) wins.
  const byKey = new Map<string, Skill>();
  // Order matters: later entries override earlier ones for the same key.
  // We want closest-ancestor project > user > plugin (and within user, real files > symlinks).
  for (const s of pluginSkills) {
    byKey.set(`${s.scope}:${s.name}`, s);
  }
  for (const s of userSkills) {
    byKey.set(`${s.scope}:${s.name}`, s);
  }
  // Project skills are visited from cwd up; the first occurrence (closest) wins,
  // so iterate in reverse and let later sets overwrite earlier ones — wait, we
  // want the closest to win, so set the farthest first then closer last.
  // scanProjectAncestorSkills already returns cwd-first; reverse to set farthest first.
  for (const s of [...projectSkills].reverse()) {
    byKey.set(`${s.scope}:${s.name}`, s);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "project" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
