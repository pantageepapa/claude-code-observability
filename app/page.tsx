import { Suspense } from "react";
import { resolveProject } from "@/lib/paths";
import { encodePath } from "@/lib/encode";
import { scanClaudeMd } from "@/lib/scan/claudeMd";
import { scanSkills } from "@/lib/scan/skills";
import { scanCommands } from "@/lib/scan/commands";
import { scanAgents } from "@/lib/scan/agents";
import { scanMemory } from "@/lib/scan/memory";
import { scanMcpServers } from "@/lib/scan/mcp";
import { scanHooks } from "@/lib/scan/hooks";
import { scanSettings } from "@/lib/scan/settings";
import { listProjects } from "@/lib/scan/projects";
import { runAllChecks } from "@/lib/health/checks";
import { HeroCard } from "@/components/HeroCard";
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

  const [
    claudeMd,
    rawSkills,
    commands,
    agents,
    mcpServers,
    projects,
    healthChecks,
    hooks,
    settingsAudit,
    memories,
  ] = await Promise.all([
    scanClaudeMd(absolute),
    scanSkills(absolute),
    scanCommands(absolute),
    scanAgents(absolute),
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
  const commandsWithHref = commands.map((c) => ({
    ...c,
    href: `/commands/${encodePath(c.path)}`,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <HeroCard
        absolute={absolute}
        encoded={encoded}
        healthChecks={healthChecks}
        projects={projects}
      />

      <Suspense fallback={null}>
        <TabbedContent
          initialTab={initialTab}
          claudeMd={claudeMd}
          memories={memories}
          skills={skills}
          commands={commandsWithHref}
          agents={agents}
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
