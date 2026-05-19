import { Suspense } from "react";
import path from "node:path";
import { tildify } from "@/lib/paths";
import { HealthSummaryLink } from "@/components/HealthSummaryLink";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import type { HealthCheck } from "@/lib/health/types";
import type { ProjectEntry } from "@/lib/types";

interface HeroCardProps {
  absolute: string;
  encoded: string;
  healthChecks: HealthCheck[];
  projects: ProjectEntry[];
}

export function HeroCard({
  absolute,
  encoded,
  healthChecks,
  projects,
}: HeroCardProps) {
  const folderName = path.basename(absolute);
  const tildified = tildify(absolute);

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: identity */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Claude Code Setup
            </span>
          </div>
          <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {folderName}
          </h1>
          <p className="mt-0.5 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {tildified}
          </p>
          <div className="mt-2">
            <Suspense fallback={null}>
              <HealthSummaryLink checks={healthChecks} projectEncoded={encoded} />
            </Suspense>
          </div>
        </div>

        {/* Right: project switcher */}
        <div className="flex shrink-0 items-center">
          <Suspense fallback={null}>
            <ProjectSwitcher projects={projects} currentEncoded={encoded} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
