import type { ReactNode } from "react";
import Link from "next/link";
import { ScopeBadge } from "./ScopeBadge";
import type { Scope } from "@/lib/types";

interface MetaItem {
  text: string;
  mono?: boolean;
}

interface DataPanelRowProps {
  href?: string;
  badge?: { scope: Scope; subtag?: string };
  title: string;
  titleMono?: boolean;
  subtitle?: string;
  subtitleMono?: boolean;
  meta?: MetaItem[];
  dim?: boolean;
}

function DataPanelRow({
  href,
  badge,
  title,
  titleMono,
  subtitle,
  subtitleMono = true,
  meta,
  dim,
}: DataPanelRowProps) {
  const inner = (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50${dim ? " opacity-50" : ""}`}
    >
      {badge && <ScopeBadge scope={badge.scope} subtag={badge.subtag} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`truncate text-sm font-medium text-zinc-900 dark:text-zinc-100${titleMono ? " font-mono" : ""}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`truncate text-xs text-zinc-500 dark:text-zinc-500${subtitleMono ? " font-mono" : ""}`}>
            {subtitle}
          </span>
        )}
      </div>
      {meta && meta.length > 0 && (
        <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
          {meta.map((item, i) => (
            <span key={i} className={item.mono ? "font-mono" : undefined}>
              {item.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

interface DataPanelProps {
  children: ReactNode;
}

function DataPanel({ children }: DataPanelProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {children}
      </div>
    </div>
  );
}

DataPanel.Row = DataPanelRow;

export { DataPanel };
