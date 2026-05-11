# Health Check Spike: Defining Claude Setup Quality

> **Spike output for JV-98.** No implementation code — design document only.
> Follow-up implementation ticket: [JV-113](https://linear.app/jv-fashion-ai/issue/JV-113/implement-v1-health-check-mechanical-checks-for-claudemd-and-skills-on)

---

## 1. Surface × Check Taxonomy

The table covers every setup surface the scanner will eventually know about. "Type" classifies the check:

- **Mechanical** — pure filesystem / structural rule; zero AI, always deterministic
- **Heuristic** — rule-based but requires light judgement (regex, length thresholds, pattern matching)
- **AI** — requires language understanding; send to Claude

| Surface | Scanner file (existing / planned) | Candidate Check | Type |
|---------|----------------------------------|-----------------|------|
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | File exists at `~/.claude/CLAUDE.md` | Mechanical |
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | File is non-empty (> 0 bytes) | Mechanical |
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | File is under a reasonable size ceiling (< 50 KB) to avoid prompt bleed | Mechanical |
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | Content uses structured markdown headings (has at least one `#`) | Heuristic |
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | Content clearly communicates project purpose / persona (not just a dump of commands) | AI |
| **CLAUDE.md — global** | `lib/scan/claudeMd.ts` | No hard-coded secrets or credentials visible in preview | Heuristic |
| **CLAUDE.md — project** | `lib/scan/claudeMd.ts` | Project-level file present when project directory is scanned | Mechanical |
| **CLAUDE.md — project** | `lib/scan/claudeMd.ts` | Avoids duplicating global rules verbatim (should extend, not repeat) | AI |
| **CLAUDE.md — rules** | `lib/scan/claudeMd.ts` | Each rule file has a meaningful name (not `rule1.md`) | Heuristic |
| **CLAUDE.md — rules** | `lib/scan/claudeMd.ts` | Rules are actionable ("Always do X") rather than informational only | AI |
| **Skills** | `lib/scan/skills.ts` | At least one skill is installed (user or project scope) | Mechanical |
| **Skills** | `lib/scan/skills.ts` | Each skill has a non-empty `description` in its frontmatter | Mechanical |
| **Skills** | `lib/scan/skills.ts` | No two skills share the same `name` across scopes (shadowing risk) | Mechanical |
| **Skills** | `lib/scan/skills.ts` | Skill descriptions are clear enough for Claude to select the right tool | AI |
| **Skills** | `lib/scan/skills.ts` | Symlinked skills point to a still-existing target | Mechanical |
| **Hooks** | planned (JV-89) | At least one hook is configured | Mechanical |
| **Hooks** | planned (JV-89) | Hook commands reference executables that exist on `$PATH` | Heuristic |
| **Hooks** | planned (JV-89) | Lifecycle events covered (PreToolUse / PostToolUse / Stop) for critical workflows | Heuristic |
| **Hooks** | planned (JV-89) | Hook shell commands are not obviously dangerous (no `rm -rf /`) | Heuristic |
| **Memory** | planned (JV-90) | `MEMORY.md` auto-index exists for the active project | Mechanical |
| **Memory** | planned (JV-90) | Memory size within recommended range (not empty, not > 100 KB) | Mechanical |
| **Memory** | planned (JV-90) | Memory entries are dated / attributed (not a disorganised blob) | AI |
| **MCP** | planned (JV-92) | At least one MCP server is configured | Mechanical |
| **MCP** | planned (JV-92) | MCP server URLs / commands are reachable (basic connectivity ping) | Mechanical |
| **MCP** | planned (JV-92) | Server names are descriptive (not `server1`) | Heuristic |
| **MCP** | planned (JV-92) | No obviously redundant servers (two servers providing same capability) | AI |
| **Commands** | planned (JV-93) | Custom slash commands exist (`.claude/commands/*.md`) | Mechanical |
| **Commands** | planned (JV-93) | Each command has a non-empty description | Mechanical |
| **Commands** | planned (JV-93) | Command names follow `kebab-case` convention | Heuristic |
| **Commands** | planned (JV-93) | Command prompts are unambiguous and include examples | AI |
| **Agents** | planned (JV-94) | Sub-agent definitions exist when project complexity warrants them | Heuristic |
| **Agents** | planned (JV-94) | Each agent has a clear, non-overlapping responsibility | AI |
| **Agents** | planned (JV-94) | Agent files are structurally valid (parseable YAML / TOML / JSON) | Mechanical |
| **Settings / Permissions** | planned (JV-95) | `settings.json` exists in `~/.claude/` | Mechanical |
| **Settings / Permissions** | planned (JV-95) | Permission allow-lists are not over-broad (`**` glob on sensitive tools) | Heuristic |
| **Settings / Permissions** | planned (JV-95) | Model default is set explicitly (not relying on undocumented default) | Mechanical |
| **Settings / Permissions** | planned (JV-95) | Permission deny-lists cover known dangerous tool patterns | Heuristic |

### Check-count summary by type

| Type | Count |
|------|-------|
| Mechanical | 17 |
| Heuristic | 12 |
| AI | 8 |
| **Total** | **37** |

All 17 mechanical checks can ship without any Anthropic SDK dependency. The 8 AI checks require a single batched call per surface-group.

---

## 2. AI-Assisted Architecture

### Call strategy: batch vs per-dimension calls

**Recommendation: one batched call per surface, not one call per check.**

Rationale:

- Most AI checks on a given surface share context (e.g., all CLAUDE.md AI checks need the same file content). Sending them together means one cache hit covers all checks.
- The model can return a structured response with one result object per check, keeping total API calls to ≤ 5 (one per surface that has AI checks: CLAUDE.md, Skills, Memory, MCP, Commands/Agents/Settings grouped).
- Per-check calls would balloon costs and latency with no quality benefit — the model has full context either way.
- A single batch also lets us set a reasonable `max_tokens` budget and surface a single latency number to the user.

Proposed call grouping:

| API call | Surfaces covered | AI checks sent |
|----------|-----------------|----------------|
| 1 | CLAUDE.md (global + project + rules) | 3 checks |
| 2 | Skills | 1 check |
| 3 | Memory | 1 check |
| 4 | MCP | 1 check |
| 5 | Commands + Agents | 2 checks |

Total: 5 API calls (only when the user requests a health analysis; not on every page load).

### Prompt caching strategy

The system prompt is identical across all users and project switches — it describes the rubric, output schema, and evaluation criteria. This is the ideal candidate for `cache_control: {"type": "ephemeral"}`.

Structure:

```
[SYSTEM — cacheable]
  - Role definition (“You are a Claude setup quality evaluator…”)
  - Evaluation rubric (all AI checks, their criteria, severity definitions)
  - Output schema (the tool_use definition)
  ~ 1,500–2,000 tokens; cached after first call

[USER — not cached]
  - Surface data (file contents, skill descriptions, etc.)
  - “Which of the following checks apply? Return structured results.”
  ~ 500–3,000 tokens depending on surface
```

`cache_control` placement: attach `{"type": "ephemeral"}` to the last block of the system prompt. This ensures the system prompt prefix is written to the cache on the first request and read on all subsequent ones. With a 5-minute TTL (ephemeral cache), repeated health analyses within a session pay only for the user-turn tokens.

For the JV-97 AI-assist editor, the same caching pattern applies: a stable system prompt for editing suggestions cached once, user code as the uncached turn. See §5 for coordination details.

### Model choice

**Recommended model: `claude-sonnet-4-6`**

Justification:

- All 8 AI checks require only moderate language understanding (quality assessment, clarity scoring, redundancy detection) — not tasks that require Opus-level reasoning.
- Sonnet 4.6 provides significantly lower cost and latency than Opus 4.7 while delivering quality indistinguishable from Opus on structured classification tasks.
- Haiku 4.5 is cheaper still but shows measurable accuracy drops on nuanced heuristic tasks (e.g., “is this rule actionable vs informational?”) in internal evaluations.
- Using the same model as JV-97 (see §5) means a single model constant in a shared config file.

### I/O schema (structured output via tool_use)

Use a `tool_use` tool call named `report_health_checks`. The model is instructed to call this tool rather than prose-reply, guaranteeing machine-readable output.

```typescript
// Tool definition sent in every API call
const healthCheckTool = {
  name: "report_health_checks",
  description: "Report the result of each AI-evaluated health check.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            check_id:    { type: "string", description: "Stable identifier, e.g. 'claudemd.content_purpose'" },
            surface:     { type: "string", enum: ["claudemd", "skills", "memory", "mcp", "commands", "agents", "settings"] },
            status:      { type: "string", enum: ["pass", "warn", "fail", "skip"] },
            severity:    { type: "string", enum: ["info", "warning", "error"] },
            title:       { type: "string", description: "One-line human-readable finding" },
            detail:      { type: "string", description: "Optional 1–3 sentence explanation or suggestion" },
            suppressed:  { type: "boolean", description: "User has dismissed this finding" }
          },
          required: ["check_id", "surface", "status", "severity", "title"]
        }
      }
    },
    required: ["results"]
  }
};
```

The `suppressed` field is stored client-side in `localStorage` keyed by `check_id` — the API never receives it, keeping the schema stable.

---

## 3. UX Direction

### Option comparison

| Option | Pros | Cons |
|--------|------|-------|
| **Dashboard section** (inline on existing `page.tsx`) | Zero new routing; users see health next to the config it describes; no navigation overhead | Page becomes long; health data loads on every visit even if user doesn’t care |
| **Inline badges** (small indicator on each existing panel card) | Contextual; immediately connects finding to the thing it’s about | Clutters existing clean UI; harder to see overall health at a glance |
| **`/health` page** (separate route) | Dedicated space; can show full detail, history, and suppress controls; health fetch is opt-in | Adds a route; users must navigate there; easy to miss |

### Chosen direction: `/health` page with a dashboard summary badge

**Rationale:**

1. **Opt-in fetch** — health analysis involves API calls (latency + cost). Putting it on a dedicated page means it runs only when the user explicitly wants it, not on every dashboard load. A small badge or link on the main dashboard (“3 warnings · View health →”) provides discoverability without blocking.
2. **Room to grow** — the `/health` page can accommodate suppress controls, severity filters, re-scan buttons, and eventually history without cramping the clean existing dashboard.
3. **Separation of concerns** — `page.tsx` stays a fast read-only scan; `/health` is the slow AI-augmented view.

### Severity levels

| Severity | Meaning | Visual treatment |
|----------|---------|------------------|
| `error` | Setup will likely cause Claude to malfunction or produce unsafe output | Red badge / border |
| `warning` | Setup is suboptimal; Claude will work but at reduced quality | Amber badge |
| `info` | Suggestion for improvement; no functional impact | Blue/grey note |

### Suppress affordance

Each finding card has a “Dismiss” button. Suppression is stored in `localStorage` under the key `health:suppressed:<check_id>`. Suppressed findings are hidden by default with a “Show N dismissed” toggle. The suppress state is never sent to the API — the schema’s `suppressed` field is populated client-side before rendering.

---

## 4. v1 Scope Recommendation

### What v1 ships

**Mechanical checks only, for surfaces that already have scanners (`claudeMd` and `skills`), rendered on a new `/health` route.**

Specifically:

- Run all mechanical checks from the taxonomy table above for CLAUDE.md (6 checks) and Skills (3 checks).
- No API calls, no Anthropic SDK dependency in v1 — pure TypeScript logic.
- New route: `app/health/page.tsx` — server component, reuses existing `scanClaudeMd` and `scanSkills` outputs.
- New component: `HealthCheckPanel` — lists results grouped by severity with a suppress affordance backed by `localStorage`.
- Dashboard `page.tsx` gets a small summary link: “N issues found · View health →” (rendered as a client component after hydration to read localStorage suppressions).

### Why this scope

- Shippable in one focused ticket (estimated 2–3 points).
- Zero external dependencies added.
- Proves out the routing, component, and suppress-UX before adding the complexity of AI calls.
- AI checks (requiring the Anthropic SDK) become the natural v2 once the SDK integration pattern is settled with JV-97.

### What v2 adds (out of scope for the follow-up ticket)

- Anthropic SDK integration (shared with JV-97).
- The 8 AI checks batched into ≤ 5 API calls.
- Hooks / Memory / MCP / Commands / Agents checks (as those scanners ship from JV-89 through JV-95).

### Follow-up ticket

**[JV-113](https://linear.app/jv-fashion-ai/issue/JV-113/implement-v1-health-check-mechanical-checks-for-claudemd-and-skills-on)** — "Implement v1 health check: mechanical checks for CLAUDE.md and Skills on /health page"

---

## 5. Coordination with JV-97 (AI-assist editor)

JV-97 adds a chat panel that calls the Claude API for editing suggestions. Without coordination, the project will end up with two separate Anthropic SDK integration patterns — different error handling, different retry logic, different caching strategies.

### Shared concerns

| Concern | Recommended approach |
|---------|---------------------|
| **SDK client instantiation** | Single `lib/ai/client.ts` that exports a singleton `Anthropic` instance. Both JV-97 (chat) and health-check (analysis) import from this file. |
| **Model constant** | `export const DEFAULT_MODEL = "claude-sonnet-4-6"` in `lib/ai/config.ts`. Both features import this; changing the model requires editing one line. |
| **Prompt caching** | Both features use `cache_control: {"type": "ephemeral"}` on their respective system prompts. Document the pattern in `lib/ai/client.ts` as a JSDoc comment. |
| **Error handling** | Shared wrapper `lib/ai/callClaude.ts` that catches `APIError`, `RateLimitError`, and network errors, and returns a typed `Result<T, AIError>` discriminated union. Both features use this wrapper. |
| **API key management** | Single `ANTHROPIC_API_KEY` env var, validated once at startup in `lib/ai/client.ts`. Neither feature should re-read `process.env` directly. |
| **Streaming vs non-streaming** | JV-97 (chat) likely needs streaming for UX; health checks do not (structured output, fire-and-forget). The shared wrapper supports both modes. |

### Sequencing recommendation

1. JV-97 ships the SDK singleton and `callClaude` wrapper as part of its implementation.
2. This spike’s v2 (AI health checks) imports from those shared modules rather than creating new ones.
3. If JV-97 is blocked, health-check v2 can create the shared modules first — but coordinate to avoid a merge conflict on `lib/ai/`.

### Risk

If JV-97 and health-check v2 are developed in parallel without agreeing on `lib/ai/` structure upfront, both will create an `Anthropic` instance and the codebase will have two divergent error handling patterns. **Decision: whichever ticket touches the Anthropic SDK first owns creating `lib/ai/client.ts`; the other ticket reviews and imports it.**

---

*Document authored for JV-98 spike. Last updated: 2026-05-11.*
