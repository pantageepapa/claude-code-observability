# Claude Code Setup Viewer

A read-only local dashboard that shows exactly what your Claude Code session sees — which `CLAUDE.md` files are active, which skills are loaded, and whether your setup passes basic health checks.

![Dashboard screenshot (placeholder — will be replaced before ship)](docs/screenshot.png)

> **Note:** the image above is a placeholder. A real screenshot will be added before the first public release.

## Quick start

```bash
git clone https://github.com/pantageepapa/claude-code-observability.git
cd claude-code-observability
pnpm setup
```

Then open <http://localhost:3000>.

That's it. `pnpm setup` runs `corepack enable && pnpm install && pnpm build && pnpm start` in one step — a production build, so the dashboard loads instantly (no on-demand compilation).

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20 or later (LTS recommended) |
| pnpm | enabled via [Corepack](https://nodejs.org/api/corepack.html) — `pnpm setup` handles this |

Corepack ships with Node 16.10+. If it is not activated yet, `pnpm setup` activates it for you.

## What you'll see

The dashboard has three main sections:

**Active CLAUDE.md** — every `CLAUDE.md` file the agent would resolve for the selected project: your user-scope `~/.claude/CLAUDE.md`, any `~/.claude/rules/*.md` overrides, the auto-memory index, and every project-scope `CLAUDE.md` up the directory tree. Shows how many files are present vs expected, with a 500-character preview on click.

**Skills** — all skills visible to the agent, split by scope (user, plugin, project) and source. Filterable by scope, searchable by name or description. Counts are shown per category in the section header.

**Health checks** — a linked summary below the page title showing how many health checks passed. Click "View health" to see per-check details with the ability to suppress checks you've acknowledged. A green indicator means all checks passed; amber means there are active issues.

**Project switcher** — top-right dropdown listing every project under `~/.claude/projects/`. Switching projects re-runs all scans for that project directory.

## What gets read / what gets written

**Read:** files under `~/.claude/` (CLAUDE.md files, rules, skills, plugins, projects index) and `CLAUDE.md` files in the selected project directory and its ancestors up to `~`.

**Written:** nothing. The dashboard is strictly read-only. No files are created, modified, or deleted. No data leaves your machine.

## Architecture

Single-process Next.js 16 (App Router). All filesystem reads happen in Server Components — the browser never touches `fs`. No database. No client state beyond the search/filter UI.

```
app/
  page.tsx              # dashboard (RSC, runs all scans in parallel)
  layout.tsx            # global shell
  health/               # health check detail page
  skills/[id]/          # per-skill detail page
lib/
  paths.ts              # ~/.claude resolution + project encoding
  encode.ts             # path encoder/decoder
  scan/
    claudeMd.ts         # cascade resolver (user → ancestors → memory)
    skills.ts           # SKILL.md frontmatter + symlink + plugin glob
    projects.ts         # decodes ~/.claude/projects/* names
  health/
    checks.ts           # health check runners
components/
  ScopeBadge.tsx        # user / project scope chips
  ClaudeMdPanel.tsx
  SkillsGrid.tsx        # client-side filter + search
  ProjectSwitcher.tsx
  HealthSummaryLink.tsx
  HealthCheckPanel.tsx
```

## Limitations

- **Bundled skills are not visible.** Skills shipped inside the Claude Code binary (e.g. built-in slash commands) won't appear unless they also exist on disk in the scanned directories.
- **Dangling symlinks are skipped.** Symlinked skill files that point to a moved target are silently dropped rather than crashing the scan.
- **No live file watching.** The page re-runs all scans on each navigation. Refresh or re-open the project dropdown to pick up changes.
