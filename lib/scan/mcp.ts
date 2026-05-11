import fs from "node:fs/promises";
import path from "node:path";
import { HOME, CLAUDE_DIR, tildify } from "../paths";
import type { McpServer, McpScope, McpTransport } from "../types";

// SECURITY: env var VALUES are never read or rendered. Only the key names
// (i.e. the keys of the `env` object) are extracted and surfaced in the UI.

interface RawMcpEntry {
  command?: unknown;
  args?: unknown;
  url?: unknown;
  env?: unknown;
  type?: unknown;
}

interface SettingsJson {
  mcpServers?: Record<string, RawMcpEntry>;
}

interface McpJson {
  mcpServers?: Record<string, RawMcpEntry>;
}

interface AuthCache {
  [serverName: string]: unknown;
}

async function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    // File absent or malformed — treat as empty, never crash.
    return null;
  }
}

function detectTransport(entry: RawMcpEntry): McpTransport {
  const rawType = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  if (rawType === "sse") return "sse";
  if (rawType === "http") return "http";
  if (typeof entry.url === "string" && entry.url.length > 0) {
    // Heuristic: if a URL is present but type is not set, treat as SSE (legacy).
    return "sse";
  }
  if (typeof entry.command === "string" && entry.command.length > 0) return "stdio";
  return "unknown";
}

function extractEnvKeys(entry: RawMcpEntry): string[] {
  // SECURITY: Only extract KEY names from the env object — never read the values.
  if (entry.env === null || typeof entry.env !== "object" || Array.isArray(entry.env)) {
    return [];
  }
  return Object.keys(entry.env as Record<string, unknown>);
}

function buildServer(
  name: string,
  entry: RawMcpEntry,
  sourcePath: string,
  scope: McpScope,
  authCache: Set<string>,
): McpServer {
  const transport = detectTransport(entry);
  return {
    name,
    transport,
    command: typeof entry.command === "string" ? entry.command : undefined,
    args: Array.isArray(entry.args)
      ? entry.args.filter((a): a is string => typeof a === "string")
      : undefined,
    url: typeof entry.url === "string" ? entry.url : undefined,
    // SECURITY: Only key names extracted — values are never stored or rendered.
    envKeys: extractEnvKeys(entry),
    sourcePath,
    scope,
    needsAuth: authCache.has(name),
  };
}

/** Merge a source file's mcpServers into the accumulator map. Later calls win. */
function mergeServers(
  acc: Map<string, McpServer>,
  data: SettingsJson | McpJson | null,
  filePath: string,
  scope: McpScope,
  authCache: Set<string>,
): void {
  if (!data || typeof data.mcpServers !== "object" || data.mcpServers === null) return;
  for (const [name, entry] of Object.entries(data.mcpServers)) {
    if (typeof entry !== "object" || entry === null) continue;
    acc.set(name, buildServer(name, entry as RawMcpEntry, tildify(filePath), scope, authCache));
  }
}

/**
 * Scan all five MCP configuration sources in precedence order (lowest first,
 * so later entries overwrite earlier ones):
 *   1. ~/.claude/settings.json               — user scope
 *   2. ~/.claude/settings.local.json         — user scope
 *   3. <project>/.mcp.json                   — project scope
 *   4. <project>/.claude/settings.json       — project scope
 *   5. <project>/.claude/settings.local.json — project scope
 *
 * Auth state is read from ~/.claude/mcp-needs-auth-cache.json (key names only).
 */
export async function scanMcpServers(projectAbsolute: string): Promise<McpServer[]> {
  const authCachePath = path.join(CLAUDE_DIR, "mcp-needs-auth-cache.json");

  const [
    userSettings,
    userSettingsLocal,
    projectMcp,
    projectSettings,
    projectSettingsLocal,
    authCacheRaw,
  ] = await Promise.all([
    safeReadJson<SettingsJson>(path.join(CLAUDE_DIR, "settings.json")),
    safeReadJson<SettingsJson>(path.join(CLAUDE_DIR, "settings.local.json")),
    safeReadJson<McpJson>(path.join(projectAbsolute, ".mcp.json")),
    safeReadJson<SettingsJson>(path.join(projectAbsolute, ".claude", "settings.json")),
    safeReadJson<SettingsJson>(path.join(projectAbsolute, ".claude", "settings.local.json")),
    safeReadJson<AuthCache>(authCachePath),
  ]);

  // Build auth set from key names only.
  const authCache = new Set<string>(
    authCacheRaw && typeof authCacheRaw === "object" ? Object.keys(authCacheRaw) : [],
  );

  const acc = new Map<string, McpServer>();

  mergeServers(acc, userSettings,        path.join(CLAUDE_DIR, "settings.json"),               "user",    authCache);
  mergeServers(acc, userSettingsLocal,   path.join(CLAUDE_DIR, "settings.local.json"),          "user",    authCache);
  mergeServers(acc, projectMcp,          path.join(projectAbsolute, ".mcp.json"),               "project", authCache);
  mergeServers(acc, projectSettings,     path.join(projectAbsolute, ".claude", "settings.json"),    "project", authCache);
  mergeServers(acc, projectSettingsLocal, path.join(projectAbsolute, ".claude", "settings.local.json"), "project", authCache);

  return Array.from(acc.values()).sort((a, b) => {
    // Group by scope: user first, then project.
    if (a.scope !== b.scope) {
      const order: McpScope[] = ["user", "project", "plugin"];
      return order.indexOf(a.scope) - order.indexOf(b.scope);
    }
    return a.name.localeCompare(b.name);
  });
}
