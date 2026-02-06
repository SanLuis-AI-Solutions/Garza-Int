---
description: Sync PROJECT_BRIEF.md from PRD with clarification prompts.
---

# /sync-brief - Sync Project Brief

$ARGUMENTS

---

## Task

Regenerate PROJECT_BRIEF.md from the current PRD and ask only missing questions.

---

## Steps

1. **Load PRD**
   - Prefer `PRD.md` or any `*PRD*.md` in root or `Docs/`

2. **Extract Key Details**
   - Problem, audience, KPIs, MVP, constraints, integrations, risks

3. **Update PROJECT_BRIEF.md**
   - Overwrite with latest extracted details

4. **Clarify**
   - Ask only the 3–5 most important missing items

---

## Output

- Updated `PROJECT_BRIEF.md`
- Clarifying questions (if needed)

---

## Usage

```
/sync-brief
```
