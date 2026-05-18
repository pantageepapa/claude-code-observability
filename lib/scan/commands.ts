import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { CLAUDE_DIR, PLUGINS_CACHE, ancestorDirs, HOME } from "../paths";
import type { SlashCommand } from "../types";

const USER_COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

interface ParsedFrontmatter {
  description: string;
  allowedTools?: string[];
  argumentHint?: string;
}

async function parseFrontmatter(filePath: string): Promise<ParsedFrontmatter> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    return {
      description: typeof data["description"] === "string" ? data["description"] : "",
      allowedTools: Array.isArray(data["allowed-tools"])
        ? (data["allowed-tools"] as string[]).filter((t) => typeof t === "string")
        : undefined,
      argumentHint: typeof data["argument-hint"] === "string" ? data["argument-hint"] : undefined,
    };
  } catch {
    // Malformed frontmatter or unreadable file — keep command with empty description.
    return { description: "" };
  }
}

interface CommandFile {
  filePath: string;
  displayName: string;
  name: string;
  mtime: string;
}

/**
 * Recursively collect .md files under `baseDir`, producing `:`-delimited
 * namespace-prefixed display names from the relative directory structure.
 *
 * Example: baseDir/commit-commands/commit.md → displayName "commit-commands:commit"
 */
async function collectCommandFiles(baseDir: string, relPrefix: string): Promise<CommandFile[]> {
  const out: CommandFile[] = [];
  const currentDir = relPrefix ? path.join(baseDir, relPrefix) : baseDir;

  let entries: string[];
  try {
    entries = await fs.readdir(currentDir);
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = path.join(currentDir, entry);
    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const childPrefix = relPrefix ? `${relPrefix}/${entry}` : entry;
      const children = await collectCommandFiles(baseDir, childPrefix);
      out.push(...children);
    } else if (stat.isFile() && entry.endsWith(".md")) {
      const bareName = entry.slice(0, -3);
      const namespaceParts = relPrefix ? relPrefix.split("/") : [];
      const displayName = [...namespaceParts, bareName].join(":");
      out.push({ filePath: full, displayName, name: bareName, mtime: stat.mtime.toISOString() });
    }
  }
  return out;
}

async function readCommandsInDir(
  commandsDir: string,
  scope: SlashCommand["scope"],
  source: SlashCommand["source"],
  pluginName?: string,
): Promise<SlashCommand[]> {
  const out: SlashCommand[] = [];
  const files = await collectCommandFiles(commandsDir, "");

  for (const { filePath, displayName, name, mtime } of files) {
    const fm = await parseFrontmatter(filePath);

    out.push({
      name,
      displayName,
      description: fm.description,
      scope,
      source,
      pluginName,
      path: filePath,
      id: `${source}:${scope}:${displayName}`,
      mtime,
      allowedTools: fm.allowedTools,
      argumentHint: fm.argumentHint,
    });
  }
  return out;
}

async function scanPluginCommands(): Promise<SlashCommand[]> {
  const all: SlashCommand[] = [];
  // Plugin cache layout: <PLUGINS_CACHE>/<marketplace>/<plugin>/<version>/commands/…
  const marketplaces = await safeReaddir(PLUGINS_CACHE);
  for (const market of marketplaces) {
    const marketDir = path.join(PLUGINS_CACHE, market);
    const plugins = await safeReaddir(marketDir);
    for (const plugin of plugins) {
      const pluginDir = path.join(marketDir, plugin);
      const versions = await safeReaddir(pluginDir);
      for (const version of versions) {
        const commandsDir = path.join(pluginDir, version, "commands");
        try {
          const stat = await fs.stat(commandsDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        const commands = await readCommandsInDir(commandsDir, "user", "plugin", `${plugin}@${market}`);
        all.push(...commands);
      }
    }
  }
  return all;
}

async function scanProjectAncestorCommands(projectAbsolute: string): Promise<SlashCommand[]> {
  const all: SlashCommand[] = [];
  for (const dir of ancestorDirs(projectAbsolute)) {
    if (dir === HOME || dir === CLAUDE_DIR) continue;
    const commandsDir = path.join(dir, ".claude", "commands");
    const commands = await readCommandsInDir(commandsDir, "project", "project");
    all.push(...commands);
  }
  return all;
}

export async function scanCommands(projectAbsolute: string): Promise<SlashCommand[]> {
  const [userCommands, pluginCommands, projectCommands] = await Promise.all([
    readCommandsInDir(USER_COMMANDS_DIR, "user", "user"),
    scanPluginCommands(),
    scanProjectAncestorCommands(projectAbsolute),
  ]);

  // Deduplicate by displayName. Closest project ancestor wins over farther ancestors;
  // user overrides plugin; project overrides user.
  const byKey = new Map<string, SlashCommand>();
  for (const c of pluginCommands) byKey.set(c.displayName, c);
  for (const c of userCommands) byKey.set(c.displayName, c);
  // projectCommands is cwd-first; reverse so the closest ancestor is set last and wins.
  for (const c of [...projectCommands].reverse()) byKey.set(c.displayName, c);

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "project" ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}
