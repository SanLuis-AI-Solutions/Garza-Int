---
description: Install global Codex skills into the current project's .agent/skills folder.
---

# /installskills - Install Global Skills

$ARGUMENTS

---

## Task

Copy all globally installed skills into this project's `.agent/skills` directory so they are available locally.

---

## Steps

Run this in the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\scripts\installskills.ps1"
```

---

## Notes

- This is a one-way copy. Re-run to pull in any new global skills.
- Existing project skills are left untouched.
