import fs from "node:fs/promises";
import path from "node:path";
import { scanClaudeMd } from "@/lib/scan/claudeMd";
import { scanSkills } from "@/lib/scan/skills";
import { CLAUDE_DIR } from "@/lib/paths";
import type { HealthCheck } from "./types";

// Regex patterns for common secret formats (heuristic — catches obvious hard-coded values)
const SECRET_PATTERNS: RegExp[] = [
  /password\s*[:=]\s*["']?[^\s"']{6,}/i,
  /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9\-_]{16,}/i,
  /secret\s*[:=]\s*["']?[^\s"']{8,}/i,
  /token\s*[:=]\s*["']?[A-Za-z0-9\-_.]{16,}/i,
  /sk-[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
];

function hasSecretPattern(text: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(text));
}

/**
 * Run all 6 CLAUDE.md mechanical checks plus the 4 Skills checks.
 * Reuses scanClaudeMd and scanSkills without modifying them.
 */
export async function runAllChecks(projectAbsolute: string): Promise<HealthCheck[]> {
  const [claudeMdEntries, skills] = await Promise.all([
    scanClaudeMd(projectAbsolute),
    scanSkills(projectAbsolute),
  ]);

  const checks: HealthCheck[] = [];

  // ── CLAUDE.md checks ────────────────────────────────────────────────────────

  // 1. User CLAUDE.md exists at ~/.claude/CLAUDE.md
  const globalEntry = claudeMdEntries.find(
    (e) => e.scope === "user" && e.label === "Global CLAUDE.md",
  );
  const globalExists = globalEntry?.exists ?? false;
  checks.push({
    id: "claudemd.global_exists",
    title: "Global CLAUDE.md exists",
    detail: globalExists
      ? `Found at ${globalEntry?.displayPath ?? path.join(CLAUDE_DIR, "CLAUDE.md")}.`
      : "No global CLAUDE.md found at ~/.claude/CLAUDE.md. Create one to give Claude persistent context.",
    severity: "error",
    passed: globalExists,
  });

  // 2. User CLAUDE.md is non-empty (> 0 bytes)
  const globalNonEmpty = globalExists && (globalEntry?.sizeBytes ?? 0) > 0;
  checks.push({
    id: "claudemd.global_non_empty",
    title: "Global CLAUDE.md is non-empty",
    detail: globalNonEmpty
      ? `File has ${globalEntry?.sizeBytes ?? 0} bytes of content.`
      : globalExists
        ? "Global CLAUDE.md exists but is empty. Add context about your workflow and preferences."
        : "Global CLAUDE.md does not exist (see check above).",
    severity: "error",
    passed: globalNonEmpty,
  });

  // 3. Under size ceiling (< 50 KB)
  const SIZE_CEILING = 50 * 1024;
  const globalSize = globalEntry?.sizeBytes ?? 0;
  const globalUnderCeiling = !globalExists || globalSize < SIZE_CEILING;
  checks.push({
    id: "claudemd.global_size_ok",
    title: "Global CLAUDE.md under 50 KB size ceiling",
    detail: globalUnderCeiling
      ? globalExists
        ? `File is ${Math.round(globalSize / 1024)} KB — well within the 50 KB limit.`
        : "File does not exist."
      : `File is ${Math.round(globalSize / 1024)} KB, which exceeds the 50 KB ceiling. Oversized context files cause prompt bleed and may degrade Claude's performance. Consider splitting into rule files.`,
    severity: "warning",
    passed: globalUnderCeiling,
  });

  // 4. Content uses structured markdown headings (has at least one #)
  const globalPreview = globalEntry?.preview ?? "";
  // We only have the first 500 chars as preview; check what we can
  const hasHeadings = globalExists && /^#{1,6}\s+\S/m.test(globalPreview);
  checks.push({
    id: "claudemd.global_has_headings",
    title: "Global CLAUDE.md uses markdown headings",
    detail: hasHeadings
      ? "File contains at least one markdown heading — good for structure."
      : globalExists
        ? "No markdown headings found in the first 500 characters of your CLAUDE.md. Adding headings (e.g. ## Persona, ## Rules) improves Claude's ability to navigate the file."
        : "File does not exist.",
    severity: "info",
    passed: hasHeadings,
  });

  // 5. No hard-coded secrets visible in preview
  const secretsFound = globalExists && hasSecretPattern(globalPreview);
  checks.push({
    id: "claudemd.no_secrets",
    title: "Global CLAUDE.md contains no obvious hard-coded secrets",
    detail: secretsFound
      ? "The visible portion of your CLAUDE.md appears to contain a hard-coded credential or API key. Remove secrets from CLAUDE.md and use environment variables instead."
      : "No obvious secret patterns detected in the visible content.",
    severity: "error",
    passed: !secretsFound,
  });

  // 6. Project-level CLAUDE.md present when a project directory is scanned
  const projectEntries = claudeMdEntries.filter((e) => e.scope === "project");
  const projectClaudeMdExists = projectEntries.some((e) => e.exists);
  checks.push({
    id: "claudemd.project_exists",
    title: "Project CLAUDE.md present",
    detail: projectClaudeMdExists
      ? "A project-level CLAUDE.md was found in the scanned directory ancestry."
      : "No project-level CLAUDE.md found. Adding one (e.g. CLAUDE.md or .claude/CLAUDE.md in your project root) lets you give Claude project-specific context.",
    severity: "info",
    passed: projectClaudeMdExists,
  });

  // ── Skills checks ───────────────────────────────────────────────────────────

  // 7. At least one skill installed
  const hasAnySkill = skills.length > 0;
  checks.push({
    id: "skills.any_installed",
    title: "At least one skill is installed",
    detail: hasAnySkill
      ? `${skills.length} skill${skills.length === 1 ? "" : "s"} found across all scopes.`
      : "No skills installed. Skills extend Claude's capabilities with reusable prompts — install at least one in ~/.claude/skills/.",
    severity: "info",
    passed: hasAnySkill,
  });

  // 8. Each skill has non-empty description in frontmatter
  const skillsMissingDescription = skills.filter((s) => !s.description.trim());
  const allSkillsHaveDescription = skillsMissingDescription.length === 0;
  checks.push({
    id: "skills.all_have_description",
    title: "All skills have a non-empty description",
    detail: allSkillsHaveDescription
      ? "Every installed skill has a description in its frontmatter."
      : `${skillsMissingDescription.length} skill${skillsMissingDescription.length === 1 ? "" : "s"} missing description: ${skillsMissingDescription.map((s) => s.name).join(", ")}. Add a \`description:\` field to each skill's SKILL.md frontmatter so Claude can select the right skill.`,
    severity: "warning",
    passed: allSkillsHaveDescription,
  });

  // 9. No two skills share the same name across scopes (shadowing risk)
  const nameCounts = new Map<string, number>();
  for (const s of skills) {
    nameCounts.set(s.name, (nameCounts.get(s.name) ?? 0) + 1);
  }
  const duplicateNames = Array.from(nameCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  const noShadowing = duplicateNames.length === 0;
  checks.push({
    id: "skills.no_name_shadowing",
    title: "No skill name collisions across scopes",
    detail: noShadowing
      ? "All skill names are unique across user, project, and plugin scopes."
      : `Skills with duplicate names found: ${duplicateNames.join(", ")}. Name collisions cause unpredictable shadowing — rename or remove the duplicates.`,
    severity: "warning",
    passed: noShadowing,
  });

  // 10. Symlinked skills point to an existing target (bonus check)
  const symlinkSkills = skills.filter((s) => s.source === "symlink");
  const brokenSymlinks: string[] = [];
  await Promise.all(
    symlinkSkills.map(async (s) => {
      try {
        await fs.stat(s.path);
      } catch {
        brokenSymlinks.push(s.name);
      }
    }),
  );
  const nobrokenSymlinks = brokenSymlinks.length === 0;
  checks.push({
    id: "skills.symlinks_valid",
    title: "Symlinked skills point to valid targets",
    detail: nobrokenSymlinks
      ? symlinkSkills.length > 0
        ? `All ${symlinkSkills.length} symlinked skill${symlinkSkills.length === 1 ? "" : "s"} resolve to valid targets.`
        : "No symlinked skills found."
      : `Broken symlinks detected for skill${brokenSymlinks.length === 1 ? "" : "s"}: ${brokenSymlinks.join(", ")}. Remove or repair the broken symlinks.`,
    severity: "error",
    passed: nobrokenSymlinks,
  });

  return checks;
}
