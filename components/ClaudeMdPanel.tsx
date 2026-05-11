import type { ClaudeMdEntry } from "@/lib/types";
import { encodePath } from "@/lib/encode";
import { formatSize, formatRelative } from "@/lib/format";
import { DataPanel } from "./DataPanel";

interface ClaudeMdPanelProps {
  entries: ClaudeMdEntry[];
}

export function ClaudeMdPanel({ entries }: ClaudeMdPanelProps) {
  return (
    <DataPanel>
      {entries.map((entry) => {
        const href = entry.exists
          ? `/claude-md/${encodePath(entry.path)}`
          : undefined;
        const meta = entry.exists
          ? [
              { text: formatSize(entry.sizeBytes) },
              { text: formatRelative(entry.mtime) },
            ]
          : [{ text: "not present" }];
        return (
          <DataPanel.Row
            key={entry.path}
            href={href}
            badge={{ scope: entry.scope }}
            title={entry.label}
            subtitle={entry.displayPath}
            meta={meta}
            dim={!entry.exists}
          />
        );
      })}
    </DataPanel>
  );
}
