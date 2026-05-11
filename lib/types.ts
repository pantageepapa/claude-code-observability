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

export interface DashboardData {
  currentProject: string;
  currentProjectEncoded: string;
  projects: ProjectEntry[];
  claudeMd: ClaudeMdEntry[];
  skills: Skill[];
}
