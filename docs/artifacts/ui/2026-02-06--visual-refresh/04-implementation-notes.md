# Implementation Notes

## Theme Layer
- Expanded `Garza-Int/theme.css` with reusable primitives:
  - segmented controls: `gi-seg`, `gi-segBtn`, `gi-segBtn--active`
  - tables: `gi-table`, `gi-thead`, `gi-tbody`, `gi-trHover`, `gi-stickyLeft`
  - selection cards: `gi-choice`, `gi-choice--active`
  - input groups: `gi-inputGroup` (+ addons)
  - pills: `gi-pill--ok`, `gi-pill--warn`
  - buttons: `gi-btn-danger`, `gi-iconBtn`
  - drop zone: `gi-dropzone`
- Removed purple from chart palette (`Garza-Int/components/charts/theme.ts`).

## Surface Updates
- Dashboard shell: added strategy pill in topbar (`Garza-Int/DashboardApp.tsx`).
- Dashboards: set Y-axis tick colors to match dark theme (`Garza-Int/components/dashboards/*.tsx`).
- Inputs: standardized number field group styling (`Garza-Int/components/inputs/Fields.tsx`).
- AI pages:
  - Visualizer fully restyled to dark theme (`Garza-Int/components/Visualizer.tsx`).
  - Market Intelligence fully restyled to dark theme (`Garza-Int/components/MarketAnalysis.tsx`).
  - AI chat made responsive and improved a11y labels (`Garza-Int/components/AIChat.tsx`).
- Approvals: table now uses shared table primitives (`Garza-Int/components/AdminApprovals.tsx`).
- Detail pages: Developer/Flipper details and Landlord spreadsheet restyled (`Garza-Int/components/details/*`).

## Verification
- `npm run build` at repo root (Vite production build) succeeded.

