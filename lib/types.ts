export type Scope = "user" | "project";

export type McpScope = "user" | "project" | "plugin";
export type McpTransport = "stdio" | "sse" | "http" | "unknown";

export interface McpServer {
  /** Name / key under mcpServers in the config file. */
  name: string;
  transport: McpTransport;
  /** Present for stdio servers. */
  command?: string;
  /** Present for stdio servers. */
  args?: string[];
  /** Present for SSE / HTTP servers. */
  url?: string;
  /** Env var KEY names only — values are never read or stored. */
  envKeys: string[];
  /** Absolute path (tildified for display) of the config file that last defined this server. */
  sourcePath: string;
  scope: McpScope;
  /** True when the server's entry appears in ~/.claude/mcp-needs-auth-cache.json. */
  needsAuth: boolean;
}

export interface ClaudeMdEntry {
  path: string;
  displayPath: string;
  scope: Scope;
  exists: boolean;
  sizeBytes: number;
  mtime: string | null;
  preview: string;
  label: string;
}

export interface Skill {
  name: string;
  description: string;
  scope: Scope;
  source: "user" | "project" | "plugin" | "symlink";
  pluginName?: string;
  symlinkTarget?: string;
  path: string;
  mtime: string | null;
  /** Pre-encoded href for the detail page, computed server-side. */
  href?: string;
}

export interface ProjectEntry {
  encoded: string;
  decoded: string;
  displayName: string;
  exists: boolean;
}

export interface DashboardData {
  currentProject: string;
  currentProjectEncoded: string;
  projects: ProjectEntry[];
  claudeMd: ClaudeMdEntry[];
  skills: Skill[];
}
