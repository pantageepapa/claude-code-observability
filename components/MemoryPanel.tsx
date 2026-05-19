import Link from "next/link";
import type { Memory } from "@/lib/types";
import { encodePath } from "@/lib/encode";
import { formatRelative } from "@/lib/format";
import { DataPanel } from "./DataPanel";

const TYPE_ORDER: Memory["memoryType"][] = ["user", "feedback", "project", "reference"];

const TYPE_LABELS: Record<Memory["memoryType"], string> = {
  user: "User",
  feedback: "Feedback",
  project: "Project",
  reference: "Reference",
};

interface MemoryPanelProps {
  memories: Memory[];
}

function IndexChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
      Index
    </span>
  );
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between bg-zinc-50 px-4 py-1.5 dark:bg-zinc-800/50">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-xs text-zinc-400">{count}</span>
    </div>
  );
}

export function MemoryPanel({ memories }: MemoryPanelProps) {
  if (memories.length === 0) {
    return (
      <DataPanel>
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-zinc-500">No auto-memory entries</p>
          <p className="mt-1 text-xs text-zinc-400">
            Claude Code automatically writes memory files here when it memorizes information about
            your project. They appear at{" "}
            <span className="font-mono">~/.claude/projects/&lt;encoded&gt;/memory/</span>.
          </p>
        </div>
      </DataPanel>
    );
  }

  const grouped = new Map<Memory["memoryType"], Memory[]>();
  for (const type of TYPE_ORDER) {
    grouped.set(type, []);
  }
  for (const m of memories) {
    grouped.get(m.memoryType)!.push(m);
  }

  return (
    <DataPanel>
      {TYPE_ORDER.flatMap((type) => {
        const group = grouped.get(type)!;
        if (group.length === 0) return [];

        return [
          <GroupHeader key={`header-${type}`} label={TYPE_LABELS[type]} count={group.length} />,
          ...group.map((m) => (
            <Link
              key={m.path}
              href={`/memory/${encodePath(m.path)}`}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50${m.isIndex ? " bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {m.name}
                  </span>
                  {m.isIndex && <IndexChip />}
                </div>
                {m.description && (
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-500">
                    {m.description}
                  </span>
                )}
                {m.preview && (
                  <span className="line-clamp-2 text-xs text-zinc-400 dark:text-zinc-600">
                    {m.preview}
                  </span>
                )}
              </div>
              <div className="shrink-0 text-xs text-zinc-400">
                {formatRelative(m.mtime)}
              </div>
            </Link>
          )),
        ];
      })}
    </DataPanel>
  );
}
