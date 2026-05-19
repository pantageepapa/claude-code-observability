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

export interface Subagent {
  name: string;
  description: string;
  scope: Scope;
  source: "user" | "project" | "plugin";
  pluginName?: string;
  tools?: string[] | "*";
  model?: string;
  path: string;
  id: string;
  mtime: string | null;
}

export interface Memory {
  name: string;
  description: string;
  memoryType: "user" | "feedback" | "project" | "reference";
  path: string;
  id: string;
  mtime: string | null;
  preview: string;
  isIndex: boolean;
}

export interface HookEntry {
  event: string;
  matcher?: string;
  command: string;
  timeout?: number;
  sourcePath: string;
  scope: Scope;
  source: "user" | "project" | "plugin";
}

export interface DashboardData {
  currentProject: string;
  currentProjectEncoded: string;
  projects: ProjectEntry[];
  claudeMd: ClaudeMdEntry[];
  skills: Skill[];
  hooks: HookEntry[];
}

export type PermissionMode = "allow" | "deny" | "ask";

export interface Permission {
  pattern: string;
  mode: PermissionMode;
  /** Tildify'd path of the settings file that contributes this rule. */
  sourceFile: string;
  scope: Scope;
  /** How many other source files also define this same pattern (0 = unique). */
  overridesCount: number;
}

export type DefaultMode = "default" | "acceptEdits" | "auto" | "plan";

export interface SettingsParseError {
  sourceFile: string;
  scope: Scope;
  error: string;
}

export interface SettingsAudit {
  permissions: Permission[];
  defaultMode: DefaultMode | null;
  /** Key names from the env block — values are never read or surfaced. */
  envKeyNames: string[];
  additionalDirectories: string[];
  parseErrors: SettingsParseError[];
}
