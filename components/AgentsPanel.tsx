import type { Subagent } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { DataPanel } from "./DataPanel";

interface AgentsPanelProps {
  agents: Subagent[];
}

function toolsLabel(tools: string[] | "*" | undefined): string {
  if (tools === "*") return "all tools";
  if (Array.isArray(tools)) return `${tools.length} tool${tools.length === 1 ? "" : "s"}`;
  return "no tools";
}

export function AgentsPanel({ agents }: AgentsPanelProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          No subagents configured
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Subagents are specialist roles that Claude can delegate tasks to. Each
          agent is a{
          " "}
          <span className="font-mono">.md</span> file with a YAML frontmatter
          block defining its name, description, and tool access.
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          Add a <span className="font-mono">.md</span> file to{
          " "}
          <span className="font-mono">~/.claude/agents/</span> to create your
          first user-scoped subagent.
        </p>
      </div>
    );
  }

  return (
    <DataPanel>
      {agents.map((agent) => {
        const pluginSubtag =
          agent.source === "plugin" && agent.pluginName
            ? `via ${agent.pluginName.split("@")[0]}`
            : undefined;

        const meta: { text: string; mono?: boolean }[] = [];
        meta.push({ text: toolsLabel(agent.tools), mono: true });
        if (agent.model) meta.push({ text: agent.model, mono: true });
        const mtime = formatRelative(agent.mtime);
        if (mtime) meta.push({ text: mtime });

        return (
          <DataPanel.Row
            key={agent.id}
            badge={{ scope: agent.scope, subtag: pluginSubtag }}
            title={agent.name}
            titleMono
            subtitle={agent.description || undefined}
            subtitleMono={false}
            meta={meta}
          />
        );
      })}
    </DataPanel>
  );
}
