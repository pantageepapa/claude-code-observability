"use client";

import { useMemo, useState } from "react";
import type { Skill } from "@/lib/types";
import { SkillCard } from "./SkillCard";

interface SkillsGridProps {
  skills: Skill[];
}

type ScopeFilter = "all" | "user" | "project" | "plugin";

export function SkillsGrid({ skills }: SkillsGridProps) {
  const [filter, setFilter] = useState<ScopeFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: skills.length, user: 0, project: 0, plugin: 0 };
    for (const s of skills) {
      if (s.scope === "project") c.project++;
      else if (s.source === "plugin") c.plugin++;
      else c.user++;
    }
    return c;
  }, [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (filter === "user" && (s.scope !== "user" || s.source === "plugin")) return false;
      if (filter === "project" && s.scope !== "project") return false;
      if (filter === "plugin" && s.source !== "plugin") return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [skills, filter, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(["all", "user", "project", "plugin"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {f} <span className="opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          No skills match.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((skill) => (
            <SkillCard key={`${skill.scope}-${skill.path}`} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
