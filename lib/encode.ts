import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

// The browser's Buffer polyfill supports "base64" but not "base64url",
// so transform manually. This keeps URL output byte-identical to Node's
// Buffer.toString("base64url") while working in both server and client bundles.
export function encodePath(absolute: string): string {
  return Buffer.from(absolute, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodePath(encoded: string): string {
  const b64 =
    encoded.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((encoded.length + 3) % 4);
  return Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Returns true only if the decoded absolute path is under one of the two
 * allowed roots:
 *   - HOME/.claude  (user-level config)
 *   - the resolved project directory (cwd at build time)
 *
 * This prevents path-traversal attacks: an attacker-controlled `encoded`
 * value that decodes to e.g. "/etc/passwd" will not pass validation.
 */
export function validateScannablePath(absolute: string): boolean {
  const resolved = path.resolve(absolute);

  const claudeRoot = path.resolve(path.join(HOME, ".claude"));
  if (resolved.startsWith(claudeRoot + path.sep) || resolved === claudeRoot) {
    return true;
  }

  const projectRoot = path.resolve(process.cwd());
  if (
    resolved.startsWith(projectRoot + path.sep) ||
    resolved === projectRoot
  ) {
    return true;
  }

  return false;
}
