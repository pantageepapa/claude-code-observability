import Link from "next/link";
import type { ClaudeMdEntry } from "@/lib/types";
import { encodePath } from "@/lib/encode";
import { ScopeBadge } from "./ScopeBadge";

interface ClaudeMdPanelProps {
  entries: ClaudeMdEntry[];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "empty";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function ClaudeMdPanel({ entries }: ClaudeMdPanelProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {entries.map((entry) => {
          const href = entry.exists ? `/claude-md/${encodePath(entry.path)}` : undefined;
          const rowContent = (
            <>
              <ScopeBadge scope={entry.scope} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.label}
                </span>
                <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-500">
                  {entry.displayPath}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                {entry.exists ? (
                  <>
                    <span>{formatSize(entry.sizeBytes)}</span>
                    <span>{formatRelative(entry.mtime)}</span>
                  </>
                ) : (
                  <span className="italic">not present</span>
                )}
              </div>
            </>
          );

          return (
            <div
              key={entry.path}
              className={`${!entry.exists ? "opacity-50" : ""}`}
            >
              {href ? (
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
                >
                  {rowContent}
                </Link>
              ) : (
                <div className="flex cursor-default items-center gap-3 px-4 py-3">
                  {rowContent}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
