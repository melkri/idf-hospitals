# AGENTS.md — AP-HP Hospital Explorer (MVP)

## Mission
Build a fast, elegant, public interactive map of **AP-HP hospitals in Île-de-France**. Each hospital is a clickable map marker. Clicking it opens a side panel with approximately **10 aggregated measures**. Hospitals belong to one of **six AP-HP Groupes Hospitalo-Universitaires (GHU)**. The website must be easy for a non-technical person to maintain through Google Sheets and deploy for free on GitHub Pages.

**Deliver a working MVP, not a complex platform.** Choose sensible defaults and implement directly. Do not add authentication, databases, servers, analytics tracking, or complicated state management.

## Stack
- **Vite + React + TypeScript** for the static frontend.
- **MapLibre GL JS** for the interactive map (use a public basemap style suitable for the provider's terms/limits; attribution is mandatory). If tile/provider configuration is unreliable, use Leaflet + OpenStreetMap tiles for development and document production tile-provider requirements.
- **Plain CSS or Tailwind CSS** for clean responsive UI; avoid heavyweight component libraries.
- **Static JSON** in `public/data/hospitals.json` for runtime data. No live Google Sheets API calls from the browser.
- **GitHub Pages** to host the build; **GitHub Actions** to deploy and optionally refresh data from a Google Sheets CSV export URL.

## MVP features (required)
1. Display a map centered on Île-de-France with usable zoom and pan. Fit bounds to included hospital markers on load.
2. Show one marker per verified physical hospital site, located from coordinates, colored by GHU (six distinct accessible colors); include a legend.
3. Search hospitals by name; filter by GHU and by department (75, 77, 78, 91, 92, 93, 94, 95). Show number of visible hospitals and a clear-filters action.
4. On marker click, open a side panel (bottom sheet on mobile) showing hospital name, GHU, city/department, and **all available measures** in clear cards with units. Handle null/missing measures as 'Not available'. Close via button/Escape.
5. Provide a map-coloring control: **GHU (default)** or **one selected numeric metric**. Show a readable continuous legend for numeric mode; do not imply 'higher = better' unless metric semantics say so. Missing values get a neutral color.
6. Keep clicks, filters, and metric switching instant: load small JSON once on startup and perform filtering client-side.
7. Meet basic accessibility standards: keyboard-operable controls, visible focus, sufficient contrast, descriptive labels, responsive layout. Preserve basemap attribution.
8. Include an obvious 'Data last updated' field, sourced from dataset metadata.

## Visual direction
Minimal, polished healthcare-data dashboard. Light theme by default. Desktop: slim top bar, left filter rail (about 260px), large map, right detail drawer on selection. Mobile: filters in collapsible area and hospital details as a bottom sheet. Use subtle borders, generous spacing, restrained colors, crisp typography; no unnecessary animations. Map is the centerpiece.

## Data contract
Use a stable site-level ID for joins. **Do not invent actual hospitals, GHU memberships, coordinates, or measure values.** For initial development, a clearly labeled synthetic fixture file is acceptable; replace with verified site-level AP-HP data before presenting as a factual map. Do not treat aggregated campuses as individual sites, or include non-Île-de-France sites.

Suggested `public/data/hospitals.json`:

```json
{
  "updated_at": "2026-11-02",
  "data_status": "demo",
  "metric_definitions": [
    { "key": "metric_01", "label": "Measure 1", "unit": "", "decimals": 1, "higher_is_better": null }
  ],
  "hospitals": [
    {
      "id": "EXAMPLE_001",
      "name": "Example hospital (synthetic)",
      "ghu_id": "GHU_1",
      "ghu_name": "Example GHU",
      "city": "Example city",
      "department": "75",
      "latitude": 48.85,
      "longitude": 2.35,
      "metrics": { "metric_01": 12.3 }
    }
  ]
}
```

- Real data: ~35–40 hospital sites, 6 GHU groups, ~10 metrics per hospital; actual site count must follow verified source data.
- Keep **coordinates and site identity** separately verifiable; do not geocode every time the site loads.
- `metric_definitions` controls labels, order, units, decimal precision and metric dropdown; adding a metric should mostly be a data/configuration change.
- Support numbers and `null`; reject invalid coordinates, duplicate IDs and unknown GHU IDs during data ingestion.
- Treat values as **aggregated, non-sensitive, public** information only.

## Google Sheets maintenance
Goal: the non-technical owner edits **one Google Sheet** (one row per hospital, static fields + metric columns); the site publishes validated JSON.

**Phase 1 (implement first):** ship with checked-in `public/data/hospitals.json`, plus a documented manual CSV-to-JSON process. Do not block MVP development on Google permissions or spreadsheet URLs.

**Phase 2 (small optional automation):**
- Provide `scripts/sync-sheet.mjs` to fetch a **published-to-web CSV export URL** from a GitHub Actions variable `GOOGLE_SHEET_CSV_URL` (never commit private tokens or credentials).
- Convert CSV rows to the JSON contract; merge authoritative static site metadata by stable ID if needed. Maintain metric metadata in a checked-in configuration file.
- Validate row counts, known hospital IDs, lat/lon bounds, GHU membership, numeric measures, and duplicates. **Fail safely and keep the previous published dataset** if validation fails.
- Schedule an Action daily (and enable manual workflow dispatch), regenerate JSON, build, and deploy to GitHub Pages. Document that changes appear after a successful sync/deployment rather than instantly.
- Published CSV **is public**. Never use this route for sensitive data. If the source must remain private, stop and propose a secure alternative rather than exposing credentials in client code.

## Repository structure (suggested)
```
/
  AGENTS.md
  README.md
  index.html
  package.json
  vite.config.ts
  src/
    App.tsx
    main.tsx
    styles.css
    components/{HospitalMap,Filters,HospitalDetails,MetricLegend}.tsx
    lib/{types,data,colors}.ts
  public/data/hospitals.json
  scripts/sync-sheet.mjs            # optional second phase
  .github/workflows/deploy.yml
```

## GitHub Pages
- Configure Vite `base` for project Pages paths (e.g. `/<repo-name>/`); support an override via environment variable for a custom domain.
- Deploy `dist/` with official GitHub Pages Actions (`configure-pages`, `upload-pages-artifact`, `deploy-pages`). Set appropriate `pages: write` and `id-token: write` permissions.
- Add local commands to README: `npm install`, `npm run dev`, `npm run build`.
- Avoid runtime server routes, secrets, paid APIs and dependencies requiring a persistent backend.

## Implementation order
1. Scaffold Vite/React/TypeScript and static JSON types/loader. Add clearly labeled demo data if verified data isn't supplied.
2. Implement map, markers, GHU colors, selected marker, and details panel.
3. Implement search, filters, count, metric-color mode, legends, and responsive layout.
4. Add loading/error/empty states and data validation tests (at least duplicates, invalid coordinates, missing measures, bad GHU).
5. Make GitHub Pages deployment work; document exactly how to replace demo data and redeploy.
6. Only then add optional Google Sheets sync.

## Acceptance criteria
- `npm run build` succeeds and the deployed site works from a GitHub Pages **project URL** (assets load under the correct base path).
- A user can search, filter, select a hospital and read its available measures with no page reload.
- GHU marker colors and numeric-metric colors/legends are correct; missing metrics are displayed safely.
- Mobile layout is usable; map attribution is visible.
- No actual hospital or metric is falsely presented as verified when it is sample data.
- README explains data schema, sheet column names, source/provenance verification, update workflow, deployment and data-publicity caveat.

## Scope limits
No login, editable map UI, backend, relational database, live BI ingestion, historical charts, patient-level data, or premature feature expansion. Prefer readable code and a working product over elaborate architecture.
