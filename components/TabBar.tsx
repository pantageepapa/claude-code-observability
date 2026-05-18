"use client";

import { useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

export type TabId =
  | "claudemd"
  | "memory"
  | "skills"
  | "mcp"
  | "hooks"
  | "permissions";

export const VALID_TABS: TabId[] = [
  "claudemd",
  "memory",
  "skills",
  "mcp",
  "hooks",
  "permissions",
];

export interface TabDef {
  id: TabId;
  label: string;
  count?: number;
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: TabId;
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  const searchParams = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const navigate = useCallback(
    (tabId: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      window.history.pushState(null, "", `/?${params.toString()}`);
    },
    [searchParams],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = tabs.length;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % count;
      tabRefs.current[next]?.focus();
      navigate(tabs[next].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + count) % count;
      tabRefs.current[prev]?.focus();
      navigate(tabs[prev].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      tabRefs.current[0]?.focus();
      navigate(tabs[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      tabRefs.current[count - 1]?.focus();
      navigate(tabs[count - 1].id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Content sections"
      className="flex gap-0.5 border-b border-zinc-200 dark:border-zinc-800"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => navigate(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
              isActive
                ? "text-zinc-900 dark:text-zinc-100 after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-zinc-900 dark:after:bg-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                ].join(" ")}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
