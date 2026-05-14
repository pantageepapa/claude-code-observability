import { Suspense } from "react";
import { resolveProject, tildify } from "@/lib/paths";
import { encodePath } from "@/lib/encode";
import { scanClaudeMd } from "@/lib/scan/claudeMd";
import { scanSkills } from "@/lib/scan/skills";
import { scanCommands } from "@/lib/scan/commands";
import { listProjects } from "@/lib/scan/projects";
import { runAllChecks } from "@/lib/health/checks";
import { ClaudeMdPanel } from "@/components/ClaudeMdPanel";
import { SkillsGrid } from "@/components/SkillsGrid";
import { CommandsPanel } from "@/components/CommandsPanel";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { HealthSummaryLink } from "@/components/HealthSummaryLink";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { absolute, encoded } = await resolveProject(params.project);

  const [claudeMd, rawSkills, commands, projects, healthChecks] = await Promise.all([
    scanClaudeMd(absolute),
    scanSkills(absolute),
    scanCommands(absolute),
    listProjects(),
    runAllChecks(absolute),
  ]);

  // Pre-encode hrefs server-side so client components don't need Node's Buffer.
  const skills = rawSkills.map((s) => ({
    ...s,
    href: `/skills/${encodePath(s.path)}`,
  }));
  const commandsWithHref = commands.map((c) => ({
    ...c,
    href: `/commands/${encodePath(c.path)}`,
  }));

  const presentClaudeMd = claudeMd.filter((e) => e.exists).length;
  const userSkillsCount = skills.filter(
    (s) => s.scope === "user" && s.source !== "plugin",
  ).length;
  const pluginSkillsCount = skills.filter((s) => s.source === "plugin").length;
  const projectSkillsCount = skills.filter((s) => s.scope === "project").length;

  const userCommandsCount = commands.filter(
    (c) => c.scope === "user" && c.source !== "plugin",
  ).length;
  const pluginCommandsCount = commands.filter((c) => c.source === "plugin").length;
  const projectCommandsCount = commands.filter((c) => c.scope === "project").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Claude Code Setup
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {tildify(absolute)}
          </p>
          <Suspense fallback={null}>
            <HealthSummaryLink checks={healthChecks} projectEncoded={encoded} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ProjectSwitcher projects={projects} currentEncoded={encoded} />
        </Suspense>
      </header>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Active CLAUDE.md
          </h2>
          <span className="text-xs text-zinc-500">
            {presentClaudeMd} of {claudeMd.length} present
          </span>
        </div>
        <ClaudeMdPanel entries={claudeMd} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Skills
          </h2>
          <span className="text-xs text-zinc-500">
            {userSkillsCount} user · {pluginSkillsCount} plugin · {projectSkillsCount} project
          </span>
        </div>
        <SkillsGrid skills={skills} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Slash Commands
          </h2>
          <span className="text-xs text-zinc-500">
            {commands.length === 0
              ? "none"
              : `${userCommandsCount} user · ${pluginCommandsCount} plugin · ${projectCommandsCount} project`}
          </span>
        </div>
        <CommandsPanel commands={commandsWithHref} />
      </section>

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Read-only view. Scans <span className="font-mono">~/.claude</span> and the selected project on each load.
      </footer>
    </div>
  );
}
