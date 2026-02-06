---
description: End-to-end startup sequence using brief + PRD to produce strategy and execution plan.
---

# /start - Project Start Pipeline

$ARGUMENTS

---

## Task

Run the full startup pipeline so projects begin with aligned strategy and a ready execution plan.

---

## Steps

0. **Load Project Brief (if present)**
   - Read `PROJECT_BRIEF.md` and use it to prefill context
   - Only ask for missing or unclear items

1. **Load Primary PRD/Notes**
   - Prefer a file named `PRD.md` or any `*PRD*.md` in the root or `Docs/`

2. **Kickoff Snapshot**
   - Problem statement
   - MVP feature list
   - Tech assumptions
   - Risks and mitigations

3. **Research Pack**
   - Audience research
   - Keyword + competitor analysis
   - Brand identity snapshot

4. **Execution Plan**
   - Produce a 7‑day plan
   - Define next actions

5. **Plan File**
   - Create `docs/PLAN-{slug}.md` with the execution plan

---

## Output

- Kickoff summary
- Research bundle
- 7‑day execution plan
- Next actions
- `docs/PLAN-{slug}.md`

---

## Usage

```
/start new AI‑powered website project
```
