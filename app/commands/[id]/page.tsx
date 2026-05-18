import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import Link from "next/link";
import { decodePath, encodePath, validateScannablePath } from "@/lib/encode";
import { scanCommands } from "@/lib/scan/commands";
import { resolveProject, tildify } from "@/lib/paths";
import { ScopeBadge } from "@/components/ScopeBadge";
import { MarkdownEditor } from "@/components/MarkdownEditor";

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

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let commandPath: string;
  try {
    commandPath = decodePath(id);
  } catch {
    return notFound();
  }

  if (!validateScannablePath(commandPath)) {
    return notFound();
  }

  const { absolute } = await resolveProject(undefined);
  const commands = await scanCommands(absolute);

  const command = commands.find((c) => path.resolve(c.path) === path.resolve(commandPath));
  if (!command) {
    return notFound();
  }

  let body = "";
  let mtime: string | null = null;
  try {
    const stat = await fs.stat(command.path);
    mtime = stat.mtime.toISOString();
    const raw = await fs.readFile(command.path, "utf-8");
    const parsed = matter(raw);
    body = parsed.content.trim();
  } catch {
    return notFound();
  }

  const subtag =
    command.source === "plugin" && command.pluginName
      ? `via ${command.pluginName.split("@")[0]}`
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
            /{command.displayName}
          </h1>
          <ScopeBadge scope={command.scope} subtag={subtag} />
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500">
          <code className="font-mono">{tildify(command.path)}</code>
          {mtime && <span>Last modified: {formatDate(mtime)}</span>}
        </div>

        {command.description && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {command.description}
          </p>
        )}

        {(command.argumentHint || command.allowedTools) && (
          <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
            {command.argumentHint && (
              <>
                <dt className="text-zinc-500">Argument hint</dt>
                <dd className="font-mono text-zinc-700 dark:text-zinc-300">
                  {command.argumentHint}
                </dd>
              </>
            )}
            {command.allowedTools && command.allowedTools.length > 0 && (
              <>
                <dt className="text-zinc-500">Allowed tools</dt>
                <dd className="font-mono text-zinc-700 dark:text-zinc-300">
                  {command.allowedTools.join(", ")}
                </dd>
              </>
            )}
          </dl>
        )}
      </header>

      <MarkdownEditor
        initialContent={body}
        encodedPath={encodePath(command.path)}
      />
    </div>
  );
}
