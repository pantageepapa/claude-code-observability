import fs from "node:fs/promises";
import path from "node:path";
import { CLAUDE_DIR, PLUGINS_CACHE, tildify } from "../paths";
import type { HookEntry, Scope } from "../types";

async function safeReadJson(filePath: string): Promise<unknown> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Canonical hooks schema:
//   settings.json { hooks: { [event]: [{ matcher?, hooks: [{ type: "command", command, timeout? }] }] } }
// Legacy flat shape:
//   { hooks: { [event]: [{ type: "command", command, timeout? }] } }
function extractHooksFromSettings(
  data: unknown,
  sourcePath: string,
  scope: Scope,
  source: HookEntry["source"],
): HookEntry[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const obj = data as Record<string, unknown>;
  const hooksSection = obj["hooks"];
  if (!hooksSection || typeof hooksSection !== "object" || Array.isArray(hooksSection)) return [];

  const result: HookEntry[] = [];
  const eventMap = hooksSection as Record<string, unknown>;

  for (const event of Object.keys(eventMap)) {
    const eventEntries = eventMap[event];
    if (!Array.isArray(eventEntries)) continue;

    for (const entry of eventEntries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const entryObj = entry as Record<string, unknown>;

      // Legacy flat shape: { type: "command", command: string, timeout?: number }
      if (typeof entryObj["command"] === "string") {
        result.push({
          event,
          command: entryObj["command"],
          timeout: typeof entryObj["timeout"] === "number" ? entryObj["timeout"] : undefined,
          sourcePath,
          scope,
          source,
        });
        continue;
      }

      // Canonical shape: { matcher?, hooks: [...] }
      const matcher = typeof entryObj["matcher"] === "string" ? entryObj["matcher"] : undefined;
      const innerHooks = entryObj["hooks"];
      if (!Array.isArray(innerHooks)) continue;

      for (const hook of innerHooks) {
        if (!hook || typeof hook !== "object" || Array.isArray(hook)) continue;
        const hookObj = hook as Record<string, unknown>;
        if (typeof hookObj["command"] !== "string") continue;
        result.push({
          event,
          matcher,
          command: hookObj["command"],
          timeout: typeof hookObj["timeout"] === "number" ? hookObj["timeout"] : undefined,
          sourcePath,
          scope,
          source,
        });
      }
    }
  }

  return result;
}

async function readHooksFromFile(
  filePath: string,
  scope: Scope,
  source: HookEntry["source"],
): Promise<HookEntry[]> {
  const data = await safeReadJson(filePath);
  if (data === null) return [];
  return extractHooksFromSettings(data, tildify(filePath), scope, source);
}

async function scanPluginHooks(): Promise<HookEntry[]> {
  const all: HookEntry[] = [];
  try {
    const marketplaces = await fs.readdir(PLUGINS_CACHE);
    for (const market of marketplaces) {
      const marketDir = path.join(PLUGINS_CACHE, market);
      let marketEntries: string[];
      try {
        marketEntries = await fs.readdir(marketDir);
      } catch {
        continue;
      }
      for (const plugin of marketEntries) {
        const pluginDir = path.join(marketDir, plugin);
        let versions: string[];
        try {
          versions = await fs.readdir(pluginDir);
        } catch {
          continue;
        }
        for (const version of versions) {
          const settingsPath = path.join(pluginDir, version, "settings.json");
          const hooks = await readHooksFromFile(settingsPath, "user", "plugin");
          all.push(...hooks);
        }
      }
    }
  } catch {
    // PLUGINS_CACHE does not exist — that's fine
  }
  return all;
}

export async function scanHooks(projectAbsolute: string): Promise<HookEntry[]> {
  const userSettings = path.join(CLAUDE_DIR, "settings.json");
  const userLocalSettings = path.join(CLAUDE_DIR, "settings.local.json");
  const projectClaudeDir = path.join(projectAbsolute, ".claude");
  const projectSettings = path.join(projectClaudeDir, "settings.json");
  const projectLocalSettings = path.join(projectClaudeDir, "settings.local.json");

  const [userHooks, userLocalHooks, projectHooks, projectLocalHooks, pluginHooks] =
    await Promise.all([
      readHooksFromFile(userSettings, "user", "user"),
      readHooksFromFile(userLocalSettings, "user", "user"),
      readHooksFromFile(projectSettings, "project", "project"),
      readHooksFromFile(projectLocalSettings, "project", "project"),
      scanPluginHooks(),
    ]);

  return [
    ...userHooks,
    ...userLocalHooks,
    ...projectHooks,
    ...projectLocalHooks,
    ...pluginHooks,
  ];
}
