"use client";

import { useSearchParams } from "next/navigation";
import { TabBar, VALID_TABS, type TabId, type TabDef } from "./TabBar";
import { ClaudeMdPanel } from "./ClaudeMdPanel";
import { MemoryPanel } from "./MemoryPanel";
import { SkillsGrid } from "./SkillsGrid";
import { McpPanel } from "./McpPanel";
import { HooksPanel } from "./HooksPanel";
import { SettingsPanel } from "./SettingsPanel";
import type { ClaudeMdEntry, Memory, McpServer, HookEntry, SettingsAudit, Skill } from "@/lib/types";

interface TabbedContentProps {
  initialTab: TabId;
  // Knowledge tab data
  claudeMd: ClaudeMdEntry[];
  memories: Memory[];
  // Skills tab data
  skills: Skill[];
  // Settings tab data
  mcpServers: McpServer[];
  hooks: HookEntry[];
  settingsAudit: SettingsAudit;
  // Counts for pills
  skillsCount: number;
  knowledgeCount: number;
  settingsCount: number;
}

function isValidTab(value: string | null): value is TabId {
  return VALID_TABS.includes(value as TabId);
}

export function TabbedContent({
  initialTab,
  claudeMd,
  memories,
  skills,
  mcpServers,
  hooks,
  settingsAudit,
  skillsCount,
  knowledgeCount,
  settingsCount,
}: TabbedContentProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : initialTab;

  const tabs: TabDef[] = [
    { id: "knowledge", label: "Knowledge", count: knowledgeCount },
    { id: "skills", label: "Skills", count: skillsCount },
    { id: "settings", label: "Settings", count: settingsCount },
  ];

  return (
    <div>
      <TabBar tabs={tabs} activeTab={activeTab} />

      {/* Knowledge tab panel */}
      <div
        role="tabpanel"
        id="tabpanel-knowledge"
        aria-labelledby="tab-knowledge"
        hidden={activeTab !== "knowledge"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Active CLAUDE.md
            </h2>
            <span className="text-xs text-zinc-500">
              {claudeMd.filter((e) => e.exists).length} of {claudeMd.length} present
            </span>
          </div>
          <ClaudeMdPanel entries={claudeMd} />
        </section>

        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Memory
            </h2>
            <span className="text-xs text-zinc-500">
              {memories.filter((m) => m.memoryType === "user").length} user
              {" · "}
              {memories.filter((m) => m.memoryType === "feedback").length} feedback
              {" · "}
              {memories.filter((m) => m.memoryType === "project").length} project
              {" · "}
              {memories.filter((m) => m.memoryType === "reference").length} reference
            </span>
          </div>
          <MemoryPanel memories={memories} />
        </section>
      </div>

      {/* Skills tab panel */}
      <div
        role="tabpanel"
        id="tabpanel-skills"
        aria-labelledby="tab-skills"
        hidden={activeTab !== "skills"}
        tabIndex={0}
        className="mt-8"
      >
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Skills
            </h2>
            <span className="text-xs text-zinc-500">
              {skills.filter((s) => s.scope === "user" && s.source !== "plugin").length} user
              {" · "}
              {skills.filter((s) => s.source === "plugin").length} plugin
              {" · "}
              {skills.filter((s) => s.scope === "project").length} project
            </span>
          </div>
          <SkillsGrid skills={skills} />
        </section>
      </div>

      {/* Settings tab panel */}
      <div
        role="tabpanel"
        id="tabpanel-settings"
        aria-labelledby="tab-settings"
        hidden={activeTab !== "settings"}
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

        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Hooks
            </h2>
            <span className="text-xs text-zinc-500">
              {hooks.filter((h) => h.scope === "user").length} user
              {" · "}
              {hooks.filter((h) => h.scope === "project").length} project
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
