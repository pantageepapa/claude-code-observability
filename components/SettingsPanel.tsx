import type { ReactNode } from "react";
import type { SettingsAudit, Permission, PermissionMode, DefaultMode } from "@/lib/types";
import type { Scope } from "@/lib/types";
import { DataPanel } from "./DataPanel";

interface SettingsPanelProps {
  audit: SettingsAudit;
}

const MODE_LABELS: Record<PermissionMode, string> = {
  allow: "Allow",
  deny: "Deny",
  ask: "Ask",
};

const DEFAULT_MODE_LABELS: Record<DefaultMode, string> = {
  default: "default (prompt on first use)",
  acceptEdits: "acceptEdits",
  auto: "auto",
  plan: "plan",
};

/** Maps a PermissionMode to the scope badge subtag shown on each row. */
function modeSubtag(mode: PermissionMode): string {
  return MODE_LABELS[mode];
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="bg-zinc-50 px-4 py-2 dark:bg-zinc-800/50">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {children}
      </span>
    </div>
  );
}

function buildMeta(permission: Permission): Array<{ text: string; mono?: boolean }> {
  const meta: Array<{ text: string; mono?: boolean }> = [
    { text: permission.sourceFile, mono: true },
  ];
  if (permission.overridesCount > 0) {
    meta.push({
      text: `overrides ${permission.overridesCount} ${permission.overridesCount === 1 ? "other" : "others"}`,
    });
  }
  return meta;
}

export function SettingsPanel({ audit }: SettingsPanelProps) {
  const { permissions, defaultMode, additionalDirectories, parseErrors } = audit;

  const byMode: Record<PermissionMode, Permission[]> = { allow: [], deny: [], ask: [] };
  for (const p of permissions) {
    byMode[p.mode].push(p);
  }

  const orderedModes: PermissionMode[] = ["allow", "deny", "ask"];

  return (
    <div className="space-y-4">
      {/* Default mode — shown prominently at panel top */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Default mode
          </span>
          <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {defaultMode ? DEFAULT_MODE_LABELS[defaultMode] : "not set (inherits Claude default)"}
          </span>
        </div>

        {additionalDirectories.length > 0 && (
          <>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <div className="px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Additional directories
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {additionalDirectories.map((dir) => (
                  <span key={dir} className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {dir}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Permission rules on DataPanel, grouped by mode (allow / deny / ask) */}
      <DataPanel>
        {permissions.length === 0 && parseErrors.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">
            No permission rules found in any settings file.
          </div>
        )}

        {orderedModes.map((mode) => {
          const rules = byMode[mode];
          if (rules.length === 0) return null;
          return (
            <div key={mode}>
              <SectionHeader>{MODE_LABELS[mode]} rules</SectionHeader>
              {rules.map((p) => (
                <DataPanel.Row
                  key={`${p.mode}:${p.pattern}`}
                  badge={{ scope: p.scope as Scope, subtag: modeSubtag(p.mode) }}
                  title={p.pattern}
                  titleMono
                  meta={buildMeta(p)}
                />
              ))}
            </div>
          );
        })}

        {parseErrors.length > 0 && (
          <div>
            <SectionHeader>Parse errors</SectionHeader>
            {parseErrors.map((err, i) => (
              <DataPanel.Row
                key={i}
                badge={{ scope: err.scope as Scope }}
                title={err.sourceFile}
                titleMono
                subtitle={err.error}
                subtitleMono={false}
              />
            ))}
          </div>
        )}
      </DataPanel>
    </div>
  );
}
