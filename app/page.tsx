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
import { ClaudeMdPanel } from "@/components/ClaudeMdPanel";
import { HooksPanel } from "@/components/HooksPanel";
import { SkillsGrid } from "@/components/SkillsGrid";
import { MemoryPanel } from "@/components/MemoryPanel";
import { McpPanel } from "@/components/McpPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { HeroCard } from "@/components/HeroCard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { absolute, encoded } = await resolveProject(params.project);

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

  const presentClaudeMd = claudeMd.filter((e) => e.exists).length;
  const userSkillsCount = skills.filter(
    (s) => s.scope === "user" && s.source !== "plugin",
  ).length;
  const pluginSkillsCount = skills.filter((s) => s.source === "plugin").length;
  const projectSkillsCount = skills.filter((s) => s.scope === "project").length;

  const memoryUserCount = memories.filter((m) => m.memoryType === "user").length;
  const memoryFeedbackCount = memories.filter((m) => m.memoryType === "feedback").length;
  const memoryProjectCount = memories.filter((m) => m.memoryType === "project").length;
  const memoryReferenceCount = memories.filter((m) => m.memoryType === "reference").length;

  const userHooksCount = hooks.filter((h) => h.scope === "user").length;
  const projectHooksCount = hooks.filter((h) => h.scope === "project").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <HeroCard
        absolute={absolute}
        tildified={tildify(absolute)}
        encoded={encoded}
        healthChecks={healthChecks}
        projects={projects}
      />

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
            Memory
          </h2>
          <span className="text-xs text-zinc-500">
            {memoryUserCount} user · {memoryFeedbackCount} feedback · {memoryProjectCount} project · {memoryReferenceCount} reference
          </span>
        </div>
        <MemoryPanel memories={memories} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            MCP Servers
          </h2>
          <span className="text-xs text-zinc-500">
            {mcpServers.length} configured
          </span>
        </div>
        <McpPanel servers={mcpServers} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Hooks
          </h2>
          <span className="text-xs text-zinc-500">
            {userHooksCount} user · {projectHooksCount} project
          </span>
        </div>
        <HooksPanel hooks={hooks} />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Permissions &amp; Settings
          </h2>
          <span className="text-xs text-zinc-500">
            {settingsAudit.permissions.length} rule{settingsAudit.permissions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <SettingsPanel audit={settingsAudit} />
      </section>

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Read-only view. Scans <span className="font-mono">~/.claude</span> and the selected project on each load.
      </footer>
    </div>
  );
}
