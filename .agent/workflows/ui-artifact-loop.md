# /ui-artifact-loop
# Multi-model UI improvement loop (Codex leads; Gemini designs; Opus reviews)

$ARGUMENTS

---

## Goal
Run a repeatable UI upgrade loop where:
- **Codex is the controller/leader** (scope, decisions, integration, verification).
- **Gemini 3 Fast** produces multiple divergent layout directions quickly.
- **Gemini 3 Pro + Stitch** produces a high-quality selected screen (artifact: screenshot + HTML).
- **Claude Opus 4.5** produces rigorous UX/a11y critique and change requests.

Defaults:
- Use Stitch for **major screens only** (Login, Dashboard shell, Inputs, Approvals, etc.).
- Store artifacts **in repo** under `Docs/artifacts/ui/`.

---

## Artifacts (Required)
Create an artifact folder first:

`Docs/artifacts/ui/YYYY-MM-DD--<slug>/`

Files:
- `00-brief.md` (Codex)
- `01-gemini-fast-options.md` (Gemini Fast)
- `02-stitch-links.md` (Gemini Pro + Stitch)
- `03-opus-review.md` (Opus)
- `04-implementation-notes.md` (Codex)

---

## Steps
1. **Brief (Codex)** -> `00-brief.md`
2. **Diverge (Gemini 3 Fast)** -> 3-7 options in `01-gemini-fast-options.md`
3. **Select (Codex)** -> decision + rationale in `00-brief.md`
4. **Converge (Gemini 3 Pro + Stitch)** -> IDs/URLs in `02-stitch-links.md`
5. **Critique (Opus 4.5)** -> change requests in `03-opus-review.md`
6. **Implement (Codex)** -> small diffs, reversible
7. **Verify (Codex)** -> `npm run build` + desktop/mobile smoke + 2 screenshots
8. **Document (Codex)** -> `04-implementation-notes.md`

---

## Copy/Paste Prompts (Templates)

### Gemini 3 Fast
> You are a senior product designer. Generate 5 distinct UI directions for: **{surface}** in a real-estate ROI dashboard.  
> Constraints: keep existing functionality; mobile-first; high-trust financial UI; avoid generic SaaS templates.  
> For each option: describe layout hierarchy, typography, color direction, and chart placement rules.

### Gemini 3 Pro + Stitch
> Take option **{N}** and refine into a single coherent design system for: **{surface list}**.  
> Output: Stitch-ready prompt(s) that generate screens with consistent tokens, spacing, and chart styling.  
> Also output a short checklist for conversion to React components.

### Opus 4.5
> Review this UI (screenshots + spec). Produce change requests only (no fluff).  
> Focus: hierarchy, clarity, accessibility, chart legibility, and trust cues for a financial dashboard.  
> Provide: severity (P0/P1/P2), what to change, and how to verify.

