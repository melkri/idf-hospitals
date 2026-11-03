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

## Google Sheets Integration & Live Updates

You can maintain and update hospital measures using a single Google Sheet without writing code or rebuilding the website.

### 1. Template & Example Files
- **Blank Template**: `public/data/sheet-template.csv` contains the exact 37 sourced hospital rows with their official IDs, names, GHU, departments, and coordinates.
- **Example with Data**: `public/data/example-sheet.csv` contains realistic sample measures for all 37 hospitals, ready to import and test immediately.

### 2. Setting Up Your Google Sheet
1. Create a new Google Sheet.
2. In Google Sheets, click **File → Import → Upload**, and select either `sheet-template.csv` or `example-sheet.csv`.
3. Protect the static columns (`id` through `longitude`) so collaborators only edit the measure columns (`metric_01` to `metric_10`) and `updated_at`.
4. Enter numbers with decimal points (no commas or currency symbols). Leave unavailable metrics blank or type `null`.

### 3. Publishing the Google Sheet as CSV
To make the sheet accessible to the live dashboard:
1. In Google Sheets, go to **File → Share → Publish to web**.
2. Under "Link", choose your tab (e.g. "Sheet1") and change the format dropdown from "Web page" to **Comma-separated values (.csv)**.
3. Click **Publish** (or Republish) and copy the generated link (e.g. `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`).

### 4. Updating the Link in the App
You can connect your Google Sheet in three simple ways:
- **Directly in the Web UI (Fastest)**: Click the **Connect** / **Edit link** button on the sheet status badge in the app header. Paste your published CSV link and click **Save & Connect**. It connects immediately and saves to your browser!
- **Via URL Parameter**: Append `?sheet=<published_url>` to your website URL (e.g. `https://your-user.github.io/idf-hospitals/?sheet=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`) to test or share a direct view.
- **Permanent Deployment Default**: In your GitHub repository, go to **Settings → Secrets and variables → Actions → Variables**, add `GOOGLE_SHEET_CSV_URL` with your published CSV link, and re-run the deployment workflow. Every visitor will automatically see your live sheet data!

### Manual Offline CSV Import (Optional)
If you prefer not to publish to the web:
1. Download your edited sheet as CSV (File → Download → Comma-separated values).
2. Run `npm run import:csv -- path/to/export.csv`.
3. Commit `public/data/hospitals.json` and push to GitHub.

## GitHub Pages Deployment

1. Push this repository to GitHub on branch `main`.
2. Go to **Settings → Pages** in your repository.
3. Under **Build and deployment > Source**, select **GitHub Actions** (not "Deploy from a branch").
4. Under **Settings → Secrets and variables → Actions → Variables**, optionally add:
   - `GOOGLE_SHEET_CSV_URL`: your published Google Sheet CSV URL.
   - `VITE_BASE_PATH`: only needed if you use a custom domain (set to `/`) or different repo name.
5. Pushing to `main` or clicking **Actions → Deploy hospital explorer → Run workflow** automatically tests, builds, and deploys the dashboard.

## Basemap and attribution

The default uses the public [OpenFreeMap Positron style](https://openfreemap.org/quick_start/) with MapLibre. Required provider and OpenStreetMap attribution remains visible in the map control. No key is required. Tiles and fonts are external requests; there is no availability guarantee. Before a large production launch, review provider terms and capacity, or configure a suitable hosted/self-hosted style using build variable `VITE_MAP_STYLE_URL`. Preserve the new provider's required attribution in its style sources. No tile scraping, offline download or bulk prefetch is implemented. The header?s Hide sidebar / Show sidebar button works on desktop and mobile and preserves current filters. The map resizes automatically.

Marker colors use six distinct group colors; names are also available in the legend and list so color is not the only identifier. Numeric colors use the full dataset minimum and maximum (unchanged by filtering), a neutral missing-value color and a sequential scale. Values are not labeled as better or worse unless metric metadata supplies that meaning.
