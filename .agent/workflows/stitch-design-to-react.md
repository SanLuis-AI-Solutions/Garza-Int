# /stitch-design-to-react
# Stitch -> artifact capture -> React component conversion (Vite/React)

$ARGUMENTS

---

## When to use
Use this workflow when a UI surface is being designed in Stitch (via Gemini Pro + Stitch) and you want to:
- capture the design as a repo artifact (links/IDs + optional screenshot/HTML),
- convert the Stitch HTML into modular React components,
- keep the output aligned with the repo’s design tokens and conventions.

Defaults:
- Stitch is used for **major screens only**.
- Artifacts are stored under `Docs/artifacts/ui/YYYY-MM-DD--<slug>/`.

---

## Prereqs
- MCP server `stitch` is configured and enabled (see `%USERPROFILE%\\.codex\\config.toml`).
- For evidence/screenshots, use `chrome_devtools` (or `puppeteer` via `MCP_DOCKER`).

---

## Artifacts (Required)
Create or reuse an artifact folder:

`Docs/artifacts/ui/YYYY-MM-DD--<slug>/`

Ensure `02-stitch-links.md` exists and contains:
- Stitch Project ID
- Screen ID(s)
- Screenshot download URL(s)
- HTML download URL(s)

---

## Steps
1. **Locate target Stitch assets**
   - Use the Stitch MCP tools to fetch screen metadata and get screenshot + HTML download URLs.

2. **Capture links/IDs**
   - Record all IDs and URLs in `02-stitch-links.md`.
   - Prefer storing URLs/IDs over committing large binaries.

3. **(Optional) Generate/refresh DESIGN.md**
   - If this is the first cohesive UI pass, generate a repo-level `DESIGN.md` from the Stitch design system.

4. **Convert Stitch HTML -> React**
   - Convert Stitch HTML into modular React components (Vite/React).
   - Requirements:
     - split into focused component files
     - keep styling token-based (avoid hardcoded hex)
     - isolate logic (handlers/hooks) from presentational components

5. **Integrate**
   - Wire the new components into the app and keep diffs small and reversible.

6. **Verify**
   - Minimum bar:
     - `npm run build`
     - desktop + mobile smoke checks
     - capture 2 screenshots for before/after evidence

7. **Document**
   - Update `04-implementation-notes.md` in the artifact folder.

---

## Notes / Guardrails
- Never commit secrets. If downloaded HTML includes keys, strip them before committing.
- If Stitch MCP is unavailable, fall back to code-first UI updates and use `/ui-ux-pro-max` for direction.

