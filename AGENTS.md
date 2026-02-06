# AGENTS.md - Codex Project Rules

These rules apply to Codex for this project and future projects that copy this file.

## Priority
1) System/Developer instructions
2) This AGENTS.md
3) Agent and skill rules (when a skill is triggered)

## Always-On Behavior
- Read `.agent/ARCHITECTURE.md` at session start.
- Read `OPERATING_MODEL.md` at session start (this is the process playbook; `AGENTS.md` remains the enforcement rules).
- Use the catalogs for current capabilities:
  - `skills-catalog.txt`
  - `agents-catalog.txt`
  - `workflows-catalog.txt`
- Use skills only when explicitly triggered (by name or clear match).
- Prefer minimal, targeted file reads.
- Keep changes safe, reversible, and consistent with existing patterns.

### Required Project Files
- If any of these are missing, treat it as project setup drift and restore them:
  - `OPERATING_MODEL.md`
  - `AGENTS.md`
  - `.agent/ARCHITECTURE.md`
  - `skills-catalog.txt`, `agents-catalog.txt`, `workflows-catalog.txt`

## Operating Model (Required)
- For multi-step work, follow the execution loop in `OPERATING_MODEL.md`:
  - triage -> choose workflow -> implement -> verify -> document
- Use MCP servers when evidence quality matters (browser checks, external services, deployments).

## Request Handling
- Clarify when requirements are ambiguous, high‑risk, or multi‑step.
- For straightforward edits, proceed without unnecessary questions.
- For multi‑file or structural changes, propose a short plan before edits.

## Code Quality & Safety
- Keep code concise and direct; avoid over‑engineering.
- Add comments only when logic is non‑obvious.
- Do not commit secrets; use `.env` and `.env.example` patterns.
- Follow existing project conventions and lint/test expectations.

## Install/Sync Shortcuts (PowerShell)
- `installall` (skills + agents + workflows)
- `installskills`, `installagents`, `installworkflows`
- `syncskills`, `syncagents`, `syncworkflows`

## Documentation Hygiene
- When adding/removing skills/agents/workflows, update:
  - `skills-catalog.txt`, `agents-catalog.txt`, `workflows-catalog.txt`
  - `.agent/ARCHITECTURE.md`

