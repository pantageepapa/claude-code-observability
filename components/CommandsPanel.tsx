"use client";

import type { SlashCommand } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { DataPanel } from "./DataPanel";

interface CommandsPanelProps {
  commands: SlashCommand[];
}

export function CommandsPanel({ commands }: CommandsPanelProps) {
  if (commands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No slash commands found.
      </div>
    );
  }

  return (
    <DataPanel>
      {commands.map((cmd) => {
        const mtime = formatRelative(cmd.mtime);
        const meta: { text: string; mono?: boolean }[] = [];
        if (cmd.pluginName) meta.push({ text: `via ${cmd.pluginName.split("@")[0]}`, mono: true });
        if (mtime) meta.push({ text: mtime });

        return (
          <DataPanel.Row
            key={cmd.id}
            href={cmd.href}
            badge={{ scope: cmd.scope }}
            title={cmd.displayName}
            titleMono
            subtitle={cmd.description || undefined}
            subtitleMono={false}
            meta={meta.length > 0 ? meta : undefined}
          />
        );
      })}
    </DataPanel>
  );
}
