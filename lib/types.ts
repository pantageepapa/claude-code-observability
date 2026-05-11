export type Scope = "user" | "project";

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
