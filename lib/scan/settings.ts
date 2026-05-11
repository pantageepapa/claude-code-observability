import fs from "node:fs/promises";
import path from "node:path";
import { HOME, CLAUDE_DIR, tildify } from "../paths";
import type {
  Permission,
  PermissionMode,
  DefaultMode,
  SettingsAudit,
  SettingsParseError,
  Scope,
} from "../types";

// Raw shape of a settings.json / settings.local.json file.
// env block values are intentionally never read — only key names are surfaced.
interface RawSettings {
  permissions?: {
    allow?: unknown;
    deny?: unknown;
    ask?: unknown;
    defaultMode?: unknown;
    additionalDirectories?: unknown;
  };
  // env block: we only inspect the keys, never the values.
  env?: Record<string, unknown>;
}

interface SourceEntry {
  filePath: string;
  scope: Scope;
}

/**
 * Settings precedence (later overrides earlier):
 *  1. ~/.claude/settings.json          (user)
 *  2. ~/.claude/settings.local.json    (user)
 *  3. <project>/.claude/settings.json  (project)
 *  4. <project>/.claude/settings.local.json (project)
 */
function buildSources(projectAbsolute: string): SourceEntry[] {
  return [
    { filePath: path.join(CLAUDE_DIR, "settings.json"), scope: "user" },
    { filePath: path.join(CLAUDE_DIR, "settings.local.json"), scope: "user" },
    { filePath: path.join(projectAbsolute, ".claude", "settings.json"), scope: "project" },
    { filePath: path.join(projectAbsolute, ".claude", "settings.local.json"), scope: "project" },
  ];
}

async function safeReadJson(filePath: string): Promise<{ data: RawSettings } | { error: string } | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null; // file simply doesn't exist
    return { error: `Could not read file: ${String(err)}` };
  }
  try {
    const data = JSON.parse(raw) as RawSettings;
    return { data };
  } catch (err) {
    return { error: `JSON parse error: ${String(err)}` };
  }
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function isDefaultMode(v: unknown): v is DefaultMode {
  return v === "default" || v === "acceptEdits" || v === "auto" || v === "plan";
}

export async function scanSettings(projectAbsolute: string): Promise<SettingsAudit> {
  const sources = buildSources(projectAbsolute);

  // Collect per-source rule lists: mode → patterns[]
  // Index corresponds to sources array order (precedence index).
  const perSourceRules: Array<Record<PermissionMode, string[]>> = [];
  const parseErrors: SettingsParseError[] = [];

  // Last-wins for scalar settings across all sources.
  let defaultMode: DefaultMode | null = null;
  const additionalDirsSet = new Set<string>();
  const envKeyNamesSet = new Set<string>();

  for (const { filePath, scope } of sources) {
    const result = await safeReadJson(filePath);

    if (result === null) {
      // File doesn't exist — push an empty rule set so indices stay aligned.
      perSourceRules.push({ allow: [], deny: [], ask: [] });
      continue;
    }

    if ("error" in result) {
      parseErrors.push({
        sourceFile: tildify(filePath),
        scope,
        error: result.error,
      });
      perSourceRules.push({ allow: [], deny: [], ask: [] });
      continue;
    }

    const { data } = result;
    const perm = data.permissions ?? {};

    const allow = extractStringArray(perm.allow);
    const deny = extractStringArray(perm.deny);
    const ask = extractStringArray(perm.ask);
    perSourceRules.push({ allow, deny, ask });

    if (isDefaultMode(perm.defaultMode)) {
      defaultMode = perm.defaultMode;
    }

    for (const dir of extractStringArray(perm.additionalDirectories)) {
      additionalDirsSet.add(dir);
    }

    // Collect env key names only — values are never read or rendered.
    if (data.env && typeof data.env === "object") {
      for (const key of Object.keys(data.env)) {
        envKeyNamesSet.add(key);
      }
    }
  }

  // Build the winning permission list with precedence and override tracking.
  // For each (mode, pattern) pair, the last source that defines it wins.
  // overridesCount = number of other sources that also define that pattern in any mode.

  // Step 1: For each pattern, collect all source indices that mention it (any mode).
  const patternSources = new Map<string, Set<number>>();
  for (let i = 0; i < perSourceRules.length; i++) {
    const rules = perSourceRules[i];
    for (const mode of ["allow", "deny", "ask"] as PermissionMode[]) {
      for (const pattern of rules[mode]) {
        if (!patternSources.has(pattern)) patternSources.set(pattern, new Set());
        patternSources.get(pattern)!.add(i);
      }
    }
  }

  // Step 2: Build winning entries — last-wins per (mode, pattern) pair.
  // Tracks (mode→pattern) so a pattern can only appear once in the output.
  const winnerByPattern = new Map<string, { mode: PermissionMode; sourceIndex: number }>();
  for (let i = 0; i < perSourceRules.length; i++) {
    const rules = perSourceRules[i];
    for (const mode of ["allow", "deny", "ask"] as PermissionMode[]) {
      for (const pattern of rules[mode]) {
        winnerByPattern.set(pattern, { mode, sourceIndex: i });
      }
    }
  }

  const permissions: Permission[] = [];
  for (const [pattern, { mode, sourceIndex }] of winnerByPattern) {
    const allSourcesForPattern = patternSources.get(pattern)!;
    const overridesCount = allSourcesForPattern.size - 1; // subtract the winner itself
    const { filePath, scope } = sources[sourceIndex];
    permissions.push({
      pattern,
      mode,
      sourceFile: tildify(filePath),
      scope,
      overridesCount,
    });
  }

  // Sort: allow first, then deny, then ask; within each group alphabetically.
  const modeOrder: Record<PermissionMode, number> = { allow: 0, deny: 1, ask: 2 };
  permissions.sort((a, b) => {
    const modeDiff = modeOrder[a.mode] - modeOrder[b.mode];
    if (modeDiff !== 0) return modeDiff;
    return a.pattern.localeCompare(b.pattern);
  });

  return {
    permissions,
    defaultMode,
    envKeyNames: Array.from(envKeyNamesSet).sort(),
    additionalDirectories: Array.from(additionalDirsSet).sort(),
    parseErrors,
  };
}
