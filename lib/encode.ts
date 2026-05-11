import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

/**
 * Encode an absolute file path to a URL-safe base64url string.
 * Reversible and safe to embed in a URL path segment.
 */
export function encodePath(absolute: string): string {
  return Buffer.from(absolute, "utf-8").toString("base64url");
}

/**
 * Decode a base64url-encoded path back to the original absolute path.
 * Throws if the encoded string is not valid base64url.
 */
export function decodePath(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf-8");
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
