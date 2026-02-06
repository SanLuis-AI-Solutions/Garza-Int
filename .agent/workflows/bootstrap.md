---
description: One-shot PRD review, brief sync, and startup plan.
---

# /bootstrap - One-Shot Startup

$ARGUMENTS

---

## Task

Run PRD review, sync brief, and generate the full startup plan in one pass.

---

## Steps

0. **Load PRD**
   - Prefer `PRD.md` or any `*PRD*.md` in root or `Docs/`

1. **PRD Review**
   - Summarize intent
   - Identify gaps and risks
   - Ask critical questions

2. **Sync Brief**
   - Regenerate `PROJECT_BRIEF.md` from PRD

3. **Start Pipeline**
   - Run kickoff snapshot
   - Run research pack
   - Generate 7‑day plan
   - Create `docs/PLAN-{slug}.md`

---

## Output

- PRD review summary + questions
- Updated PROJECT_BRIEF.md
- Kickoff summary
- Research bundle
- 7‑day execution plan
- `docs/PLAN-{slug}.md`

---

## Usage

```
/bootstrap
```
