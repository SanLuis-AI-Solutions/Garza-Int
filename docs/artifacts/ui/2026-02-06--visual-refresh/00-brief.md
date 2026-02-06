# Visual Refresh (Theme Cohesion Pass)

## Goal
Make the Garza ROI dashboard feel like a premium, trustworthy "real estate intelligence" product:
- consistent dark theme across all major surfaces
- unified buttons/inputs/tables/modals
- charts readable in dark mode
- remove remaining indigo/purple cues on active surfaces

## Surfaces In Scope
- Dashboard shell topbar badge (strategy pill)
- Strategy dashboards (charts + KPI grid)
- New Project modal + project switcher
- AI surfaces: Visualizer + Market Intelligence + AI chat
- Detail pages: Developer/Flipper detail + Landlord spreadsheet
- Admin approvals table

## Constraints
- Keep Tailwind as CDN usage (no Tailwind build pipeline changes)
- CSS-variable driven theme via `Garza-Int/theme.css`
- No behavioral changes to calculations, auth, or persistence

## Success Criteria
- App looks consistent across tabs (Dashboard, Inputs, Detail, AI, Approvals).
- Chart axes/ticks/tooltips remain readable in dark mode.
- Primary actions feel intentional and brand-forward.

