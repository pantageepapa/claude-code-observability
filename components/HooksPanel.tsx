import type { HookEntry } from "@/lib/types";
import { DataPanel } from "./DataPanel";

interface HooksPanelProps {
  hooks: HookEntry[];
}

export function HooksPanel({ hooks }: HooksPanelProps) {
  if (hooks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">No hooks configured</p>
        <p className="mt-2">
          Hooks let Claude Code run shell commands automatically on tool use or prompt events.
          Add them under the <span className="font-mono">hooks</span> key in{" "}
          <span className="font-mono">~/.claude/settings.json</span> or your project&apos;s{" "}
          <span className="font-mono">.claude/settings.json</span>.
          Use the <span className="font-mono">update-config</span> skill to manage hooks without
          editing JSON by hand.
        </p>
      </div>
    );
  }

  // Group hooks by event, preserving insertion order (already in precedence order from scanner).
  const byEvent = new Map<string, HookEntry[]>();
  for (const hook of hooks) {
    const group = byEvent.get(hook.event) ?? [];
    group.push(hook);
    byEvent.set(hook.event, group);
  }

  return (
    <DataPanel>
      {Array.from(byEvent.entries()).map(([event, entries]) => (
        <EventGroup key={event} event={event} entries={entries} />
      ))}
    </DataPanel>
  );
}

function EventGroup({ event, entries }: { event: string; entries: HookEntry[] }) {
  return (
    <>
      {/* Group header row */}
      <div className="flex items-center gap-2 bg-zinc-50 px-4 py-1.5 dark:bg-zinc-800/60">
        <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {event}
        </span>
        <span className="text-xs text-zinc-400">{entries.length}</span>
      </div>

      {entries.map((hook, i) => {
        const scopeLabel = hook.source === "plugin" ? "plugin" : hook.scope;
        const subtitle = hook.matcher
          ? `matcher: ${hook.matcher}  ·  ${hook.sourcePath}`
          : hook.sourcePath;
        const meta: { text: string; mono?: boolean }[] = [
          { text: scopeLabel },
        ];
        if (hook.timeout !== undefined) {
          meta.push({ text: `${hook.timeout}ms`, mono: true });
        }
        return (
          <DataPanel.Row
            key={`${event}-${i}`}
            badge={{ scope: hook.scope === "user" && hook.source === "plugin" ? "user" : hook.scope }}
            title={hook.command}
            titleMono
            subtitle={subtitle}
            subtitleMono={false}
            meta={meta}
          />
        );
      })}
    </>
  );
}
