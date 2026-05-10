# TODOS

## Phase 1 — v1 (read-only dashboard)

- [x] Scaffold Next.js 15 + TypeScript + Tailwind v4
- [x] Install gray-matter for SKILL.md frontmatter parsing
- [ ] Implement filesystem scan layer (`lib/scan/`)
- [ ] Build UI components (ScopeBadge, SkillCard, ClaudeMdPanel, ProjectSwitcher)
- [ ] Wire dashboard page (`app/page.tsx` reads server-side, renders both panels)
- [ ] Verify in browser: panels populate, project switcher swaps view

## Phase 2 — drill-in (deferred)

- [ ] Per-skill detail page (full SKILL.md rendered)
- [ ] CLAUDE.md inline expand-to-render-markdown

## Phase 3 — broader scope (deferred until asked)

- [ ] MCP server panel (with secret redaction)
- [ ] Plugin panel
- [ ] Hooks panel
- [ ] Settings panel (with secret redaction — mandatory)
- [ ] Live file watching / auto-refresh
