import type { Skill } from "@/lib/types";
import { ScopeBadge } from "./ScopeBadge";

interface SkillCardProps {
  skill: Skill;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

export function SkillCard({ skill }: SkillCardProps) {
  const subtag =
    skill.source === "plugin" && skill.pluginName
      ? `via ${skill.pluginName.split("@")[0]}`
      : skill.source === "symlink"
        ? "symlinked"
        : undefined;

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {skill.name}
        </h3>
        <ScopeBadge scope={skill.scope} subtag={subtag} />
      </div>
      <p className="line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {skill.description ? truncate(skill.description, 220) : (
          <span className="italic text-zinc-400">No description</span>
        )}
      </p>
    </div>
  );
}
