# /kickoff
# Fast project kickoff using PROJECT_BRIEF.md + PRD

$ARGUMENTS

---

## Task

Accelerate a new project kickoff by loading context and producing a short execution plan.

---

## Steps

0. **Load Project Brief (if present)**
   - Read `PROJECT_BRIEF.md` and use it to prefill context
   - Only ask for missing or unclear items

1. **Load Primary PRD/Notes**
   - Prefer a file named `PRD.md` or any `*PRD*.md` in the root or `Docs/`
   - Summarize scope, goals, and constraints

2. **Generate Kickoff Snapshot**
   - Problem statement
   - MVP feature list
   - Tech assumptions
   - Risks and mitigations

3. **Produce 7‑Day Execution Plan**
   - Day 1–2: setup and architecture
   - Day 3–5: core features
   - Day 6–7: QA, deploy, analytics

4. **Next Actions**
   - Immediate tasks to start implementation

---

## Output

- One‑page kickoff summary
- 7‑day execution plan
- Top risks + mitigations
- Next actions

---

## Usage

```
/kickoff new AI‑powered website project
```
