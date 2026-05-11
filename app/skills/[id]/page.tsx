import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { decodePath, validateScannablePath } from "@/lib/encode";
import { scanSkills } from "@/lib/scan/skills";
import { resolveProject, tildify } from "@/lib/paths";
import { ScopeBadge } from "@/components/ScopeBadge";
import { MarkdownView } from "@/components/MarkdownView";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Decode and validate the path
  let skillDir: string;
  try {
    skillDir = decodePath(id);
  } catch {
    return notFound();
  }

  if (!validateScannablePath(skillDir)) {
    return notFound();
  }

  // Resolve the current project to scan skills
  const { absolute } = await resolveProject(undefined);
  const skills = await scanSkills(absolute);

  // Find the skill with a matching path
  const skill = skills.find((s) => path.resolve(s.path) === path.resolve(skillDir));
  if (!skill) {
    return notFound();
  }

  // Read the SKILL.md body
  const skillMdPath = path.join(skill.path, "SKILL.md");
  let body = "";
  let mtime: string | null = null;
  try {
    const stat = await fs.stat(skillMdPath);
    mtime = stat.mtime.toISOString();
    const raw = await fs.readFile(skillMdPath, "utf-8");
    // Strip frontmatter so the body is clean markdown
    const parsed = matter(raw);
    body = parsed.content.trim();
  } catch {
    return notFound();
  }

  const subtag =
    skill.source === "plugin" && skill.pluginName
      ? `via ${skill.pluginName.split("@")[0]}`
      : skill.source === "symlink"
        ? "symlinked"
        : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Dashboard
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {skill.name}
          </h1>
          <ScopeBadge scope={skill.scope} subtag={subtag} />
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500">
          <code className="font-mono">{tildify(skill.path)}</code>
          {mtime && (
            <span>Last modified: {formatDate(mtime)}</span>
          )}
        </div>

        {skill.description && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {skill.description}
          </p>
        )}
      </header>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {body ? (
          <MarkdownView body={body} />
        ) : (
          <p className="text-sm italic text-zinc-400">No content.</p>
        )}
      </div>
    </div>
  );
}
