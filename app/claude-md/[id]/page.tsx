import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { decodePath, validateScannablePath } from "@/lib/encode";
import { scanClaudeMd } from "@/lib/scan/claudeMd";
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

export default async function ClaudeMdDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Decode and validate the path
  let filePath: string;
  try {
    filePath = decodePath(id);
  } catch {
    return notFound();
  }

  if (!validateScannablePath(filePath)) {
    return notFound();
  }

  // Resolve the current project to scan CLAUDE.md entries
  const { absolute } = await resolveProject(undefined);
  const entries = await scanClaudeMd(absolute);

  // Find the entry with a matching path
  const entry = entries.find((e) => path.resolve(e.path) === path.resolve(filePath));
  if (!entry || !entry.exists) {
    return notFound();
  }

  // Read the full body (the scan only stored a 500-char preview)
  let body = entry.preview;
  try {
    body = await fs.readFile(entry.path, "utf-8");
  } catch {
    // fall back to the preview stored in the scan entry
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Dashboard
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {entry.label}
          </h1>
          <ScopeBadge scope={entry.scope} />
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500">
          <code className="font-mono">{tildify(entry.path)}</code>
          {entry.mtime && (
            <span>Last modified: {formatDate(entry.mtime)}</span>
          )}
        </div>
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
