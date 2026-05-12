import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { decodePath, validateScannablePath } from "@/lib/encode";
import { scanMemory } from "@/lib/scan/memory";
import { resolveProject, tildify } from "@/lib/paths";
import Link from "next/link";
import type { Memory } from "@/lib/types";

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

const TYPE_BADGE_STYLES: Record<
  Memory["memoryType"],
  { bg: string; text: string; ring: string }
> = {
  user: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  feedback: {
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-700 dark:text-purple-300",
    ring: "ring-purple-200 dark:ring-purple-800",
  },
  project: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
  reference: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    ring: "ring-zinc-200 dark:ring-zinc-700",
  },
};

function MemoryTypeBadge({ type }: { type: Memory["memoryType"] }) {
  const s = TYPE_BADGE_STYLES[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
    >
      {type}
    </span>
  );
}

export default async function MemoryDetailPage({ params }: PageProps) {
  const { id } = await params;

  let filePath: string;
  try {
    filePath = decodePath(id);
  } catch {
    return notFound();
  }

  if (!validateScannablePath(filePath)) {
    return notFound();
  }

  const { absolute } = await resolveProject(undefined);
  const memories = await scanMemory(absolute);

  const memory = memories.find(
    (m) => path.resolve(m.path) === path.resolve(filePath),
  );
  if (!memory) {
    return notFound();
  }

  let body = memory.preview;
  try {
    body = await fs.readFile(memory.path, "utf-8");
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
            {memory.name}
          </h1>
          <MemoryTypeBadge type={memory.memoryType} />
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500">
          <code className="font-mono">{tildify(memory.path)}</code>
          {memory.mtime && (
            <span>Last modified: {formatDate(memory.mtime)}</span>
          )}
        </div>

        {memory.description && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {memory.description}
          </p>
        )}
      </header>

      <pre className="min-h-[400px] w-full overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
        {body}
      </pre>
    </div>
  );
}
