import type { McpServer, McpScope } from "@/lib/types";
import { DataPanel } from "./DataPanel";

interface McpPanelProps {
  servers: McpServer[];
}

const SCOPE_ORDER: McpScope[] = ["user", "project", "plugin"];

const TRANSPORT_CHIP_STYLES: Record<string, string> = {
  stdio: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800",
  sse:   "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800",
  http:  "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-800",
  unknown: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
};

function TransportChip({ transport }: { transport: string }) {
  const cls = TRANSPORT_CHIP_STYLES[transport] ?? TRANSPORT_CHIP_STYLES.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {transport}
    </span>
  );
}

function NeedsAuthBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
      needs auth
    </span>
  );
}

function McpServerRow({ server }: { server: McpServer }) {
  // Build the subtitle: show command+args for stdio, url for sse/http.
  let subtitle: string | undefined;
  if (server.transport === "stdio" && server.command) {
    const parts = [server.command, ...(server.args ?? [])];
    subtitle = parts.join(" ");
  } else if (server.url) {
    subtitle = server.url;
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100 mr-auto">
          {server.name}
        </span>
        <TransportChip transport={server.transport} />
        {server.needsAuth && <NeedsAuthBadge />}
      </div>
      {subtitle && (
        <p className="font-mono text-xs text-zinc-500 truncate">
          {subtitle}
        </p>
      )}
      {server.envKeys.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {server.envKeys.map((key) => (
            <span
              key={key}
              className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {key}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-400 font-mono truncate">{server.sourcePath}</p>
    </div>
  );
}

function ScopeGroup({ scope, servers }: { scope: McpScope; servers: McpServer[] }) {
  if (servers.length === 0) return null;
  return (
    <>
      <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {scope}
        </span>
      </div>
      {servers.map((server) => (
        <div key={server.name} className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
          <McpServerRow server={server} />
        </div>
      ))}
    </>
  );
}

export function McpPanel({ servers }: McpPanelProps) {
  if (servers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No MCP servers configured.
      </div>
    );
  }

  const byScope = new Map<McpScope, McpServer[]>(
    SCOPE_ORDER.map((s) => [s, []]),
  );
  for (const server of servers) {
    byScope.get(server.scope)?.push(server);
  }

  return (
    <DataPanel>
      {SCOPE_ORDER.map((scope) => (
        <ScopeGroup key={scope} scope={scope} servers={byScope.get(scope) ?? []} />
      ))}
    </DataPanel>
  );
}
