# /syncskills
# Sync local project skills with global skills.
# Usage: run `syncskills` from the project root.

- Ensure you are in the project root (contains `.agent/skills`).
- Run `syncskills` to merge local and global skills.
- Conflicts resolve by most recent folder timestamp.

This keeps `%USERPROFILE%\.codex\skills` and `.agent/skills` in lockstep.
