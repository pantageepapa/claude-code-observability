import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { decodePath, validateScannablePath } from "@/lib/encode";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).encodedPath !== "string" ||
    typeof (body as Record<string, unknown>).content !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing encodedPath or content" },
      { status: 400 },
    );
  }

  const { encodedPath, content } = body as { encodedPath: string; content: string };

  // Decode and validate — never trust client-supplied paths
  let realPath: string;
  try {
    realPath = decodePath(encodedPath);
  } catch {
    return NextResponse.json({ error: "Invalid path encoding" }, { status: 400 });
  }

  if (!validateScannablePath(realPath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  // Determine final content: preserve YAML frontmatter if the file has it
  let finalContent: string;
  try {
    const existing = await fs.readFile(realPath, "utf-8");
    const parsed = matter(existing);
    if (Object.keys(parsed.data).length > 0) {
      // File has frontmatter — preserve it, replace only the body
      finalContent = matter.stringify(content, parsed.data);
    } else {
      finalContent = content;
    }
  } catch {
    // File may not exist yet or unreadable — write content as-is
    finalContent = content;
  }

  // Atomic write: write to a temp file, then rename
  const tmpPath = `${realPath}.tmp`;
  try {
    await fs.writeFile(tmpPath, finalContent, "utf-8");
    await fs.rename(tmpPath, realPath);
  } catch (err) {
    // Clean up temp file on failure (best effort)
    await fs.unlink(tmpPath).catch(() => undefined);
    const message = err instanceof Error ? err.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Return the new mtime
  try {
    const stat = await fs.stat(realPath);
    return NextResponse.json({ mtime: stat.mtime.toISOString() });
  } catch {
    return NextResponse.json({ mtime: new Date().toISOString() });
  }
}
