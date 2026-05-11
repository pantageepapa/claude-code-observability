import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { CLAUDE_DIR, PLUGINS_CACHE, ancestorDirs, HOME } from "../paths";
import type { Subagent } from "../types";

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

interface ParsedAgent {
  name: string;
  description: string;
  tools?: string[] | "*";
  model?: string;
}

async function parseAgentMd(
  agentMdPath: string,
  fallbackName: string,
): Promise<ParsedAgent | null> {
  try {
    const raw = await fs.readFile(agentMdPath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as {
      name?: unknown;
      description?: unknown;
      tools?: unknown;
      model?: unknown;
    };

    let tools: string[] | "*" | undefined;
    if (data.tools === "*") {
      tools = "*";
    } else if (Array.isArray(data.tools)) {
      tools = data.tools.filter((t): t is string => typeof t === "string");
    }

    return {
      name: typeof data.name === "string" ? data.name : fallbackName,
      description: typeof data.description === "string" ? data.description : "",
      tools,
      model: typeof data.model === "string" ? data.model : undefined,
    };
  } catch {
    return null;
  }
}

async function readAgentsInDir(
  baseDir: string,
  scope: Subagent["scope"],
  source: Subagent["source"],
  pluginName?: string,
): Promise<Subagent[]> {
  const out: Subagent[] = [];
  const entries = await safeReaddir(baseDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const agentPath = path.join(baseDir, entry);
    let stat;
    try {
      stat = await fs.stat(agentPath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    const fallbackName = entry.replace(/\.md$/, "");
    const parsed = await parseAgentMd(agentPath, fallbackName);
    if (!parsed) continue;

    out.push({
      name: parsed.name,
      description: parsed.description,
      scope,
      source,
      pluginName,
      tools: parsed.tools,
      model: parsed.model,
      path: agentPath,
      id: `${source}:${agentPath}`,
      mtime: stat.mtime.toISOString(),
    });
  }
  return out;
}

async function scanPluginAgents(): Promise<Subagent[]> {
  const all: Subagent[] = [];
  // Plugin cache layout: <PLUGINS_CACHE>/<marketplace>/<plugin>/<version>/agents/<agent>.md
  const marketplaces = await safeReaddir(PLUGINS_CACHE);
  for (const market of marketplaces) {
    const marketDir = path.join(PLUGINS_CACHE, market);
    const plugins = await safeReaddir(marketDir);
    for (const plugin of plugins) {
      const pluginDir = path.join(marketDir, plugin);
      const versions = await safeReaddir(pluginDir);
      for (const version of versions) {
        const agentsDir = path.join(pluginDir, version, "agents");
        try {
          const stat = await fs.stat(agentsDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        const agents = await readAgentsInDir(
          agentsDir,
          "user",
          "plugin",
          `${plugin}@${market}`,
        );
        all.push(...agents);
      }
    }
  }
  return all;
}

async function scanProjectAncestorAgents(
  projectAbsolute: string,
): Promise<Subagent[]> {
  const all: Subagent[] = [];
  for (const dir of ancestorDirs(projectAbsolute)) {
    if (dir === HOME || dir === CLAUDE_DIR) continue;
    const agentsDir = path.join(dir, ".claude", "agents");
    const agents = await readAgentsInDir(agentsDir, "project", "project");
    all.push(...agents);
  }
  return all;
}

export async function scanAgents(projectAbsolute: string): Promise<Subagent[]> {
  const userAgentsDir = path.join(CLAUDE_DIR, "agents");
  const [userAgents, pluginAgents, projectAgents] = await Promise.all([
    readAgentsInDir(userAgentsDir, "user", "user"),
    scanPluginAgents(),
    scanProjectAncestorAgents(projectAbsolute),
  ]);

  // Deduplicate by name within scope; closest project ancestor wins.
  const byKey = new Map<string, Subagent>();
  for (const a of pluginAgents) {
    byKey.set(`${a.scope}:${a.name}`, a);
  }
  for (const a of userAgents) {
    byKey.set(`${a.scope}:${a.name}`, a);
  }
  // scanProjectAncestorAgents returns cwd-first; reverse so closest overwrites farthest.
  for (const a of [...projectAgents].reverse()) {
    byKey.set(`${a.scope}:${a.name}`, a);
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "project" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
