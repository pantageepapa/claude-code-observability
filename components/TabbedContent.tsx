"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TabBar, VALID_TABS, type TabId, type TabDef } from "./TabBar";
import { ClaudeMdPanel } from "./ClaudeMdPanel";
import { MemoryPanel } from "./MemoryPanel";
import { SkillsGrid } from "./SkillsGrid";
import { CommandsPanel } from "./CommandsPanel";
import { AgentsPanel } from "./AgentsPanel";
import { McpPanel } from "./McpPanel";
import { HooksPanel } from "./HooksPanel";
import { SettingsPanel } from "./SettingsPanel";
import type {
  ClaudeMdEntry,
  Memory,
  McpServer,
  HookEntry,
  SettingsAudit,
  Skill,
  SlashCommand,
  Subagent,
} from "@/lib/types";

interface TabbedContentProps {
  initialTab: TabId;
  claudeMd: ClaudeMdEntry[];
  memories: Memory[];
  skills: Skill[];
  commands: SlashCommand[];
  agents: Subagent[];
  mcpServers: McpServer[];
  hooks: HookEntry[];
  settingsAudit: SettingsAudit;
}

function isValidTab(value: string | null): value is TabId {
  return VALID_TABS.includes(value as TabId);
}

export function TabbedContent({
  initialTab,
  claudeMd,
  memories,
  skills,
  commands,
  agents,
  mcpServers,
  hooks,
  settingsAudit,
}: TabbedContentProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : initialTab;

  const presentClaudeMd = claudeMd.filter((e) => e.exists).length;

  const tabs: TabDef[] = [
    { id: "claudemd", label: "CLAUDE.md", count: presentClaudeMd },
    { id: "memory", label: "Memory", count: memories.length },
    { id: "skills", label: "Skills", count: skills.length },
    { id: "commands", label: "Commands", count: commands.length },
    { id: "agents", label: "Agents", count: agents.length },
    { id: "mcp", label: "MCP", count: mcpServers.length },
    { id: "hooks", label: "Hooks", count: hooks.length },
    {
      id: "permissions",
      label: "Permissions",
      count: settingsAudit.permissions.length,
    },
  ];

  const memoryByType = {
    user: memories.filter((m) => m.memoryType === "user").length,
    feedback: memories.filter((m) => m.memoryType === "feedback").length,
    project: memories.filter((m) => m.memoryType === "project").length,
    reference: memories.filter((m) => m.memoryType === "reference").length,
  };

  const skillsByScope = {
    user: skills.filter((s) => s.scope === "user" && s.source !== "plugin")
      .length,
    plugin: skills.filter((s) => s.source === "plugin").length,
    project: skills.filter((s) => s.scope === "project").length,
  };

  const commandsByScope = {
    user: commands.filter((c) => c.scope === "user" && c.source !== "plugin")
      .length,
    plugin: commands.filter((c) => c.source === "plugin").length,
    project: commands.filter((c) => c.scope === "project").length,
  };

  const agentsByScope = {
    user: agents.filter((a) => a.scope === "user" && a.source !== "plugin")
      .length,
    plugin: agents.filter((a) => a.source === "plugin").length,
    project: agents.filter((a) => a.scope === "project").length,
  };

  const hooksByScope = {
    user: hooks.filter((h) => h.scope === "user").length,
    project: hooks.filter((h) => h.scope === "project").length,
  };

  return (
    <div>
      <TabBar tabs={tabs} activeTab={activeTab} />

      <div
        role="tabpanel"
        id="tabpanel-claudemd"
        aria-labelledby="tab-claudemd"
        hidden={activeTab !== "claudemd"}
        tabIndex={0}
        className="mt-8"
      >
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
      </div>

      <div
        role="tabpanel"
        id="tabpanel-memory"
        aria-labelledby="tab-memory"
        hidden={activeTab !== "memory"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Memory
            </h2>
            <span className="text-xs text-zinc-500">
              {memoryByType.user} user
              {" · "}
              {memoryByType.feedback} feedback
              {" · "}
              {memoryByType.project} project
              {" · "}
              {memoryByType.reference} reference
            </span>
          </div>
          <MemoryPanel memories={memories} />
        </section>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-skills"
        aria-labelledby="tab-skills"
        hidden={activeTab !== "skills"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Skills
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {skillsByScope.user} user
                {" · "}
                {skillsByScope.plugin} plugin
                {" · "}
                {skillsByScope.project} project
              </span>
              <Link
                href="/skills/new"
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              >
                + New skill
              </Link>
            </div>
          </div>
          <SkillsGrid skills={skills} />
        </section>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-commands"
        aria-labelledby="tab-commands"
        hidden={activeTab !== "commands"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Slash Commands
            </h2>
            <span className="text-xs text-zinc-500">
              {commands.length === 0
                ? "none"
                : `${commandsByScope.user} user · ${commandsByScope.plugin} plugin · ${commandsByScope.project} project`}
            </span>
          </div>
          <CommandsPanel commands={commands} />
        </section>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-agents"
        aria-labelledby="tab-agents"
        hidden={activeTab !== "agents"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Subagents
            </h2>
            <span className="text-xs text-zinc-500">
              {agents.length === 0
                ? "none configured"
                : `${agentsByScope.user} user · ${agentsByScope.plugin} plugin · ${agentsByScope.project} project`}
            </span>
          </div>
          <AgentsPanel agents={agents} />
        </section>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-mcp"
        aria-labelledby="tab-mcp"
        hidden={activeTab !== "mcp"}
        tabIndex={0}
        className="mt-8"
      >
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
      </div>

      <div
        role="tabpanel"
        id="tabpanel-hooks"
        aria-labelledby="tab-hooks"
        hidden={activeTab !== "hooks"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Hooks
            </h2>
            <span className="text-xs text-zinc-500">
              {hooksByScope.user} user
              {" · "}
              {hooksByScope.project} project
            </span>
          </div>
          <HooksPanel hooks={hooks} />
        </section>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-permissions"
        aria-labelledby="tab-permissions"
        hidden={activeTab !== "permissions"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Permissions &amp; Settings
            </h2>
            <span className="text-xs text-zinc-500">
              {settingsAudit.permissions.length} rule
              {settingsAudit.permissions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <SettingsPanel audit={settingsAudit} />
        </section>
      </div>
    </div>
  );
}
