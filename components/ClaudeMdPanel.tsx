import type { ClaudeMdEntry } from "@/lib/types";
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
        {entries.map((entry) => (
          <details
            key={entry.path}
            className={`group ${!entry.exists ? "opacity-50" : ""}`}
          >
            <summary
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                !entry.exists ? "cursor-default" : ""
              }`}
            >
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
            </summary>
            {entry.exists && entry.preview && (
              <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {entry.preview}
                  {entry.preview.length >= 500 && (
                    <span className="text-zinc-400"> …</span>
                  )}
                </pre>
              </div>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}
