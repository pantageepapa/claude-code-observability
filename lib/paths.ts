import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export const HOME = os.homedir();
export const CLAUDE_DIR = path.join(HOME, ".claude");
export const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
export const PLUGINS_CACHE = path.join(CLAUDE_DIR, "plugins", "cache");
export const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
export const RULES_DIR = path.join(CLAUDE_DIR, "rules");

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

// Encoding goes /Users/jbae/Dev/foo → -Users-jbae-Dev-foo. Both `/`
// and `-` collapse to `-`, so decoding is ambiguous when an original
// path segment contained a hyphen (e.g. digital-wardrobe). Try
// candidates from longest-prefix-merged to fully-split until one
// resolves to an actual directory; fall back to the naive form.
export async function decodeProjectName(encoded: string): Promise<string> {
  const stripped = encoded.replace(/^-/, "");
  const parts = stripped.split("-");
  const sepCount = parts.length - 1;
  if (sepCount === 0) return "/" + stripped;

  // Cap the search space; deep paths (>16 hyphens) fall back to naive decode.
  if (sepCount > 16) return "/" + parts.join("/");

  // Iterate masks where bit=1 means "this hyphen stays a hyphen", bit=0 means "/".
  // Prefer fewest-merges first so naive `all /` is tried first.
  const total = 1 << sepCount;
  const masksByPopcount: number[][] = Array.from({ length: sepCount + 1 }, () => []);
  for (let m = 0; m < total; m++) masksByPopcount[popcount(m)].push(m);

  for (const bucket of masksByPopcount) {
    for (const mask of bucket) {
      const candidate = "/" + reconstruct(parts, mask);
      if (await pathExists(candidate)) return candidate;
    }
  }
  return "/" + parts.join("/");
}

function reconstruct(parts: string[], mask: number): string {
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const keepHyphen = (mask >> (i - 1)) & 1;
    out += (keepHyphen ? "-" : "/") + parts[i];
  }
  return out;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>>= 1;
  }
  return c;
}

export function encodeProjectPath(absolute: string): string {
  return absolute
    .split("/")
    .filter(Boolean)
    .map((s) => "-" + s)
    .join("");
}

export async function resolveProject(
  queryParam: string | undefined,
): Promise<{ absolute: string; encoded: string }> {
  if (queryParam) {
    const decoded = await decodeProjectName(queryParam);
    return { absolute: decoded, encoded: queryParam };
  }
  const cwd = process.cwd();
  return { absolute: cwd, encoded: encodeProjectPath(cwd) };
}

export function tildify(p: string): string {
  if (p.startsWith(HOME)) return "~" + p.slice(HOME.length);
  return p;
}

// Walk from `start` upward, collecting every directory until (and including) `~`.
// Anything outside HOME is excluded so we don't scan the entire filesystem.
export function ancestorDirs(start: string): string[] {
  const out: string[] = [];
  let current = path.resolve(start);
  while (current.startsWith(HOME)) {
    out.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return out;
}
