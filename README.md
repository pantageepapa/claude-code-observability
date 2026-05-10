# Claude Code Setup Viewer

A read-only local dashboard that shows what your Claude Code session actually sees: which `CLAUDE.md` files are active and which skills are loaded, split into **user-scope** (`~/.claude/`) and **project-scope** (per-project and ancestor `.claude/` directories).

## Quick start

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

The dashboard reads from your real `~/.claude/` and from the project shown in the top-right dropdown. Default project = the dev server's cwd. Switch projects via the dropdown to see how the picture changes.

## What you get in v1

- **Active CLAUDE.md** panel — every CLAUDE.md the agent would resolve from `~/.claude/`, `~/.claude/rules/*.md`, the auto-memory index, plus every `CLAUDE.md` and `.claude/CLAUDE.md` from the selected project up the tree to `~`. Click a row to see a 500-char preview.
- **Skills** panel — user-scope skills from `~/.claude/skills/`, plugin skills from `~/.claude/plugins/cache/*/*/*/skills/`, and project-scope skills from every `.claude/skills/` directory between the selected project and `~`. Filter by scope, search by name/description.
- **Project switcher** — every project under `~/.claude/projects/`, with the encoded path → real path resolved by trying every plausible decoding (handles ambiguous `-` vs `/` from the encoding).

## Out of scope (deferred)

- MCP servers, plugins (as their own panel), hooks, `settings.json` — when these are added, secret redaction becomes mandatory because `~/.claude/settings.json` ships with live tokens.
- Editing anything. v1 is read-only.
- Live file watching. The page refetches on each navigation; click the project dropdown again or refresh to rescan.
- Per-skill drill-in pages. Cards show only the frontmatter description.

## Limitations to be aware of

- **Bundled skills are not visible.** Skills shipped inside the Claude Code binary itself (e.g. `simplify`, `loop` when not present on disk) won't appear unless they exist in the directories scanned above.
- **Dangling symlinks are skipped.** Many `~/.claude/skills/<name>/SKILL.md` files are symlinks into a `gstack/` subdir that may have moved. Those entries are silently dropped rather than crashing the scan.

## Architecture

Single-process Next.js 16 (App Router). All filesystem reads happen in Server Components — the browser never touches `fs`. No database. No client state beyond the search/filter UI. See `lib/scan/` for the discovery logic and `app/page.tsx` for orchestration.

```
app/
  page.tsx              # dashboard (RSC, runs all scans in parallel)
  layout.tsx            # global shell
lib/
  paths.ts              # ~/.claude resolution + project encoding
  scan/
    claudeMd.ts         # cascade resolver (user → ancestors → memory)
    skills.ts           # SKILL.md frontmatter + symlink + plugin glob
    projects.ts         # decodes ~/.claude/projects/* names
components/
  ScopeBadge.tsx        # 🟦 user / 🟩 project chips
  SkillCard.tsx
  SkillsGrid.tsx        # client-side filter + search
  ClaudeMdPanel.tsx
  ProjectSwitcher.tsx
```
