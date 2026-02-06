---
description: Generate a concise handoff summary for a new chat.
---

# /handoff - Chat Handoff Summary

$ARGUMENTS

---

## Task

Create a compact summary for a new chat: goals, current state, decisions, and next actions.

---

## Steps

0. **Load Project Brief (if present)**
   - Read `PROJECT_BRIEF.md` and use it to prefill context

1. **Scan Key Docs**
   - PRD in `Docs/`
   - `DECISIONS.md`
   - `ROADMAP.md`

2. **Summarize**
   - Current status
   - Decisions made
   - Top risks
   - Next actions

---

## Output

- Handoff summary (1 page max)
- Next actions

---

## Usage

```
/handoff
```
