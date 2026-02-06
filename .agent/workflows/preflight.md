---
description: Preflight checklist to ensure core docs and environment setup are ready.
---

# /preflight - Project Preflight

$ARGUMENTS

---

## Task

Verify required docs and setup are in place before build starts.

---

## Steps

0. **Load Project Brief (if present)**
   - Read `PROJECT_BRIEF.md` and use it to prefill context

1. **Docs Check**
   - Confirm `PROJECT_BRIEF.md`
   - Confirm PRD in `Docs/`
   - Confirm `DECISIONS.md` and `ROADMAP.md`

2. **Env Check**
   - Confirm `.env.example`
   - List missing environment variables

3. **Workflow Readiness**
   - Confirm `/start`, `/kickoff`, `/research-pack`, `/brand-identity` exist

---

## Output

- Checklist status
- Missing items (if any)
- Next actions

---

## Usage

```
/preflight
```
