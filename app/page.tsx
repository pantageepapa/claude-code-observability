import { Suspense } from "react";
import { resolveProject, tildify } from "@/lib/paths";
import { encodePath } from "@/lib/encode";
import { scanClaudeMd } from "@/lib/scan/claudeMd";
import { scanSkills } from "@/lib/scan/skills";
import { scanMemory } from "@/lib/scan/memory";
import { scanMcpServers } from "@/lib/scan/mcp";
import { scanHooks } from "@/lib/scan/hooks";
import { scanSettings } from "@/lib/scan/settings";
import { listProjects } from "@/lib/scan/projects";
import { runAllChecks } from "@/lib/health/checks";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { HealthSummaryLink } from "@/components/HealthSummaryLink";
import { TabbedContent } from "@/components/TabbedContent";
import { VALID_TABS, type TabId } from "@/components/TabBar";

export const dynamic = "force-dynamic";

function resolveTab(value: string | undefined): TabId {
  if (value && (VALID_TABS as string[]).includes(value)) return value as TabId;
  return "claudemd";
}

interface PageProps {
  searchParams: Promise<{ project?: string; tab?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { absolute, encoded } = await resolveProject(params.project);
  const initialTab = resolveTab(params.tab);

  const [claudeMd, rawSkills, mcpServers, projects, healthChecks, hooks, settingsAudit, memories] = await Promise.all([
    scanClaudeMd(absolute),
    scanSkills(absolute),
    scanMcpServers(absolute),
    listProjects(),
    runAllChecks(absolute),
    scanHooks(absolute),
    scanSettings(absolute),
    scanMemory(absolute),
  ]);

  // Pre-encode hrefs server-side so client components don't need Node's Buffer.
  const skills = rawSkills.map((s) => ({
    ...s,
    href: `/skills/${encodePath(s.path)}`,
  }));

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

      <Suspense fallback={null}>
        <TabbedContent
          initialTab={initialTab}
          claudeMd={claudeMd}
          memories={memories}
          skills={skills}
          mcpServers={mcpServers}
          hooks={hooks}
          settingsAudit={settingsAudit}
        />
      </Suspense>

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Read-only view. Scans <span className="font-mono">~/.claude</span> and the selected project on each load.
      </footer>
    </div>
  );
}
