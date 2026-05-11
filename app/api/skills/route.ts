import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { encodePath, validateScannablePath } from "@/lib/encode";
import { SKILLS_DIR } from "@/lib/paths";
import type { Scope } from "@/lib/types";

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;

  // Validate required fields
  if (typeof body.scope !== "string" || !["user", "project"].includes(body.scope)) {
    return NextResponse.json({ error: "scope must be 'user' or 'project'" }, { status: 400 });
  }
  if (typeof body.name !== "string" || !NAME_RE.test(body.name)) {
    return NextResponse.json(
      { error: "name must match /^[a-z0-9][a-z0-9-]*$/" },
      { status: 400 },
    );
  }
  if (typeof body.description !== "string" || body.description.trim() === "") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (typeof body.body !== "string") {
    return NextResponse.json({ error: "body must be a string" }, { status: 400 });
  }

  const scope = body.scope as Scope;
  const name = body.name as string;
  const description = body.description as string;
  const mdBody = (body.body as string).trim();

  // Resolve the target directory
  let skillsBaseDir: string;
  if (scope === "user") {
    skillsBaseDir = SKILLS_DIR; // ~/.claude/skills
  } else {
    // Project scope: <project>/.claude/skills
    const projectRoot =
      typeof body.projectRoot === "string" && body.projectRoot.trim() !== ""
        ? body.projectRoot.trim()
        : process.cwd();
    skillsBaseDir = path.join(projectRoot, ".claude", "skills");
  }

  const skillDir = path.join(skillsBaseDir, name);
  const skillMdPath = path.join(skillDir, "SKILL.md");

  // Security: validate that both the base dir and the skill dir are within allowed roots.
  if (!validateScannablePath(skillsBaseDir) || !validateScannablePath(skillDir)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  // Refuse if directory already exists (collision check)
  try {
    await fs.stat(skillDir);
    // If we get here, it exists
    return NextResponse.json(
      { error: `A skill named '${name}' already exists at that scope.` },
      { status: 409 },
    );
  } catch {
    // Expected: directory does not exist, proceed
  }

  // Build SKILL.md content using matter.stringify
  const frontmatter = { name, description };
  const fileContent = matter.stringify(mdBody ? `\n${mdBody}\n` : "", frontmatter);

  // Create the directory and write atomically
  try {
    await fs.mkdir(skillDir, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create skill directory";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const tmpPath = `${skillMdPath}.tmp`;
  try {
    await fs.writeFile(tmpPath, fileContent, "utf-8");
    await fs.rename(tmpPath, skillMdPath);
  } catch (err) {
    // Best-effort cleanup
    await fs.unlink(tmpPath).catch(() => undefined);
    const message = err instanceof Error ? err.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Return the encodedId so the client can redirect to /skills/[encodedId]
  const encodedId = encodePath(skillDir);
  return NextResponse.json({ encodedId }, { status: 201 });
}
