import type { Scope } from "@/lib/types";

interface ScopeBadgeProps {
  scope: Scope;
  subtag?: string;
}

const SCOPE_STYLES: Record<Scope, { bg: string; dot: string; label: string }> = {
  user: {
    bg: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800",
    dot: "bg-blue-500",
    label: "user",
  },
  project: {
    bg: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
    dot: "bg-emerald-500",
    label: "project",
  },
};

export function ScopeBadge({ scope, subtag }: ScopeBadgeProps) {
  const style = SCOPE_STYLES[scope];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.bg}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        {style.label}
      </span>
      {subtag && (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
          {subtag}
        </span>
      )}
    </span>
  );
}
