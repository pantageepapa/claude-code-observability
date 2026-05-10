"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ProjectEntry } from "@/lib/types";

interface ProjectSwitcherProps {
  projects: ProjectEntry[];
  currentEncoded: string;
}

export function ProjectSwitcher({ projects, currentEncoded }: ProjectSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("project", value);
    else params.delete("project");
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Project
      </label>
      <select
        value={currentEncoded}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {!projects.some((p) => p.encoded === currentEncoded) && (
          <option value={currentEncoded}>(current cwd)</option>
        )}
        {projects.map((p) => (
          <option key={p.encoded} value={p.encoded} disabled={!p.exists}>
            {p.displayName}
            {!p.exists ? " (missing)" : ""}
          </option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-zinc-500">loading…</span>
      )}
    </div>
  );
}
