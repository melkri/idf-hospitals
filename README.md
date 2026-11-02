# AP-HP Hospital Explorer

A static Vite + React + TypeScript dashboard with a MapLibre map, name search, GHU and department filters, numeric coloring, accessible marker buttons and a responsive measure drawer. No backend, credentials or analytics.

**The checked-in dataset contains 37 sourced ?le-de-France hospital locations.** AP-HP supplies the directory and GHU memberships; secondary geographic sources supply approximate campus points. All measures are null. See [source provenance and coverage](public/data/PROVENANCE.md) for per-site source fields, exclusions, campus scope and remaining official geographic verification. This is not a navigation service. Synthetic data exists only in `tests/fixtures/demo.json`.

## Run locally

Requires Node 22.12+ (Node 24 recommended).

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open the printed local URL including `/idf-hospitals/`. Build output is `dist/`. The JSON is fetched once, relative to Vite's base path; filters and colors are calculated locally. Internet access and WebGL are needed for the basemap. If tiles fail, the hospital list and details remain usable.

## Maintain the location registry and add measures

Edit `public/data/hospitals.json`. Use a verified physical-site registry, not a list of aggregated campuses. Include only Île-de-France sites; the verified source determines the number of sites. Keep stable site IDs and check each site's official name, department, GHU membership and coordinates independently against authoritative AP-HP and geographic sources. Never infer actual GHU membership from the synthetic groups.

The current `data_status` is `locations`: sourced approximate campus points and no collected measures. Before setting it to `verified`, reconcile coordinates and campus coverage with official geographic records, verify the six-group mapping (`GHU_1` through `GHU_6` in `src/lib/data.ts`), and extend `public/data/PROVENANCE.md` with source URLs, retrieval dates, coordinate verification and measure definitions. Reconcile source totals and exclusions, ensure measures refer to compatible periods, and document units and methodology. The MVP does not claim source verification automatically.

Top-level fields: `updated_at` (ISO date), `data_status` (`demo`, `locations` or `verified`), `metric_definitions`, `hospitals`. Each metric definition has `key`, `label`, `unit`, `decimals` (0–6), and `higher_is_better` (boolean or null). Order determines dropdown and card order; adding metrics requires no UI code. Optional hospital fields `address`, `identity_source` and `coordinate_source` provide source links in the detail panel. Each hospital has `id`, `name`, `ghu_id`, `ghu_name`, `city`, `department`, `latitude`, `longitude`, `metrics`. Measures must be finite numbers or null. Omitted measures display “Not available.” Zero is a valid value.

Validation rejects duplicate IDs, inconsistent group names, unknown groups, unsupported departments, non-numeric values, unknown measures and coordinates outside the regional bounding box (latitude 48.1–49.25, longitude 1.4–3.6). The bounding box is a sanity check; verify actual regional boundaries and site coordinates separately. Runtime validation also runs before the UI displays data.

## Maintain through one Google Sheet

Phase 1 is a manual, validated import. Start from the verified JSON registry above. Use one row per site and these exact CSV headers:

```csv
id,name,ghu_id,ghu_name,city,department,latitude,longitude,metric_01,metric_02,metric_03,metric_04,metric_05,metric_06,metric_07,metric_08,metric_09,metric_10
```

Use the actual metric keys from `metric_definitions` if changed. Keep IDs and department codes as text; numbers use a decimal point and no thousands separators. Leave unavailable metric cells blank or use `null`. CSV quoting supports commas and line breaks in names. Every metric column must exist.

1. Copy static fields from the authoritative JSON registry into the sheet and protect those columns. Edit only measure columns during routine maintenance.
2. Download the sheet as CSV (File → Download → Comma-separated values).
3. Run `npm run import:csv -- path/to/export.csv` from the repository root.
4. Run `npm test` and `npm run build`; inspect the diff, commit the changed JSON, and push to `main`.

The importer requires the same row count and known IDs, rejects duplicates and changed static metadata, validates all values, then atomically replaces the dataset. On validation failure it leaves the previous JSON untouched. New sites or corrected static metadata require an explicit registry review and JSON update first. Successful import sets the update date; edits appear publicly only after successful deployment. Optional scheduled Sheets fetching is deliberately outside this Phase 1 MVP.

Use only aggregated, public, non-sensitive information. A published-to-web CSV is public to anyone with its URL. Never publish patient data, private credentials or sensitive measures. For a private source, retain the manual download process or design a separate secure ingestion process; never add private tokens to frontend code.

## GitHub Pages

Push this repository to GitHub with a `main` branch. In Settings → Pages → Build and deployment, select **GitHub Actions**. The included workflow runs validation tests and builds, then uses the official configure-pages, upload-pages-artifact and deploy-pages actions. GitHub's environment or organization policy may require an owner to enable Pages or approve the first deployment.

The default Vite base is `/idf-hospitals/`. The Action gets the actual Pages base path from configure-pages. For a custom domain, set repository variable `VITE_BASE_PATH` to an empty string (the resulting path is `/`); for a different project path use `/project-name` without the trailing slash. For local builds, set environment variable `VITE_BASE_PATH` to `/` or `/project-name/`. Do not serve a project build at the root without rebuilding with the matching base.

## Basemap and attribution

The default uses the public [OpenFreeMap Positron style](https://openfreemap.org/quick_start/) with MapLibre. Required provider and OpenStreetMap attribution remains visible in the map control. No key is required. Tiles and fonts are external requests; there is no availability guarantee. Before a large production launch, review provider terms and capacity, or configure a suitable hosted/self-hosted style using build variable `VITE_MAP_STYLE_URL`. Preserve the new provider's required attribution in its style sources. No tile scraping, offline download or bulk prefetch is implemented. The header?s Hide sidebar / Show sidebar button works on desktop and mobile and preserves current filters. The map resizes automatically.

Marker colors use six distinct group colors; names are also available in the legend and list so color is not the only identifier. Numeric colors use the full dataset minimum and maximum (unchanged by filtering), a neutral missing-value color and a sequential scale. Values are not labeled as better or worse unless metric metadata supplies that meaning.
