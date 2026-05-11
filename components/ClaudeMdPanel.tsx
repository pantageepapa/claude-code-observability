import type { ClaudeMdEntry } from "@/lib/types";
import { formatSize, formatRelative } from "@/lib/format";
import { DataPanel } from "./DataPanel";
import { ScopeBadge } from "./ScopeBadge";

interface ClaudeMdPanelProps {
  entries: ClaudeMdEntry[];
}

export function ClaudeMdPanel({ entries }: ClaudeMdPanelProps) {
  return (
    <DataPanel>
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
    </DataPanel>
  );
}
