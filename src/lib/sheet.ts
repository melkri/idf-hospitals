import {parse} from 'csv-parse/browser/esm/sync';
import {validateData, type Dataset, type Metric} from './data.ts';

export const sheetColumns = ['id', 'name', 'ghu_id', 'ghu_name', 'city', 'department', 'latitude', 'longitude'] as const;
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const maxCsvLength = 2_000_000;

function numericCell(raw: string, label: string): number {
  if (!numericPattern.test(raw) || !Number.isFinite(Number(raw))) {
    throw new Error(`Invalid number: ${label}`);
  }
  return Number(raw);
}

/** Overlay measures only. Site identity, coordinates and sources stay in the registry. */
export function mergeSheetCsv(csv: string, registry: Dataset): Dataset {
  validateData(registry);
  if (csv.length > maxCsvLength) throw new Error('CSV exceeds the 2 MB limit');
  
  const defByKey = new Map(registry.metric_definitions.map(m => [m.key, m]));
  const defByLabel = new Map(registry.metric_definitions.map(m => [m.label.toLowerCase().trim(), m]));
  const metaColumns = new Set([...sheetColumns, 'updated_at', 'address']);
  let activeMetrics: { header: string; key: string; definition: Metric }[] = [];

  const rows = parse(csv, {
    columns(headers: string[]) {
      if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV columns');
      if (headers.some(h => !h.trim())) throw new Error('Empty CSV column header');

      for (const key of sheetColumns) {
        if (!headers.includes(key)) throw new Error(`Missing CSV column: ${key}`);
      }

      for (const h of headers) {
        if (/^metric_\d+$/i.test(h) && !defByKey.has(h)) {
          throw new Error(`Unknown CSV column: ${h}`);
        }
      }

      const nonMeta = headers.filter(h => !metaColumns.has(h));
      const usesMetricKeys = nonMeta.some(h => /^metric_\d+$/i.test(h));

      if (usesMetricKeys) {
        for (const m of registry.metric_definitions) {
          if (!headers.includes(m.key) && !headers.includes(m.label)) {
            throw new Error(`Missing CSV column: ${m.key}`);
          }
        }
      }

      activeMetrics = nonMeta.map(header => {
        const byKey = defByKey.get(header);
        if (byKey) return { header, key: byKey.key, definition: byKey };
        const byLabel = defByLabel.get(header.toLowerCase().trim());
        if (byLabel) {
          return {
            header,
            key: header,
            definition: { ...byLabel, key: header, label: header }
          };
        }
        return {
          header,
          key: header,
          definition: {
            key: header,
            label: header,
            unit: '',
            decimals: 1,
            higher_is_better: null
          }
        };
      });

      return headers;
    },
    skip_empty_lines: true,
    bom: true,
    trim: true,
    max_record_size: 50_000,
  }) as Record<string, string>[];

  if (rows.length !== registry.hospitals.length) {
    throw new Error('Row count changed: review the authoritative site registry first');
  }
  const sites = new Map(registry.hospitals.map(site => [site.id, site]));
  const imported = new Map<string, Record<string, number | null>>();
  const dates = new Set<string>();

  for (const row of rows) {
    const site = sites.get(row.id);
    if (!site) throw new Error(`Unknown site ID: ${row.id}`);
    if (imported.has(row.id)) throw new Error(`Duplicate hospital ID: ${row.id}`);
    for (const key of ['name', 'ghu_id', 'ghu_name', 'city', 'department'] as const) {
      if (row[key] !== site[key]) throw new Error(`Static metadata mismatch for ${row.id}: ${key}`);
    }
    if (numericCell(row.latitude, `${row.id} latitude`) !== site.latitude ||
        numericCell(row.longitude, `${row.id} longitude`) !== site.longitude) {
      throw new Error(`Coordinate mismatch: ${row.id}`);
    }
    if ('address' in row && row.address !== site.address) throw new Error(`Address mismatch: ${row.id}`);
    if ('updated_at' in row) dates.add(row.updated_at);
    imported.set(row.id, Object.fromEntries(activeMetrics.map(m => {
      const raw = row[m.header];
      return [m.key, raw === '' || raw === 'null' || raw === undefined ? null : numericCell(raw, `${row.id} ${m.header}`)];
    })));
  }

  if (dates.size > 1) throw new Error('Use the same updated_at date on every row');
  const updated_at = dates.size ? [...dates][0] : registry.updated_at;

  const resultMetricDefs = activeMetrics.length > 0
    ? activeMetrics.map(m => m.definition)
    : registry.metric_definitions;

  return validateData({
    ...registry,
    updated_at,
    metric_definitions: resultMetricDefs,
    hospitals: registry.hospitals.map(site => ({...site, metrics: imported.get(site.id)!})),
  });
}

export function publishedSheetUrl(input: string): string {
  let url: URL;
  try {
    // Strip trailing hash fragment before parsing, as users often copy #gid=... from browser
    const cleanInput = input.trim().split('#')[0];
    url = new URL(cleanInput);
  } catch {
    throw new Error('Use the published Google Sheet CSV URL');
  }
  const isPubCsv = /^\/spreadsheets\/d\/(?:e\/)?[A-Za-z0-9_-]+\/pub$/.test(url.pathname) && url.searchParams.get('output') === 'csv';
  const isExportCsv = /^\/spreadsheets\/d\/[A-Za-z0-9_-]+\/export$/.test(url.pathname) && url.searchParams.get('format') === 'csv';

  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port ||
      url.username || url.password || (!isPubCsv && !isExportCsv)) {
    throw new Error('Use File > Share > Publish to web > CSV, then copy the published URL');
  }
  return url.href;
}

export async function fetchSheet(
  url: string,
  registry: Dataset,
  {signal, fetcher = fetch}: {signal?: AbortSignal; fetcher?: typeof fetch} = {},
): Promise<Dataset> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  try {
    const response = await fetcher(publishedSheetUrl(url), {
      mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
    });
    if (!response.ok) throw new Error(`Sheet request failed (HTTP ${response.status})`);
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('The sheet returned a web page. Publish the selected tab as CSV without sign-in.');
    }
    if (Number(response.headers.get('content-length')) > maxCsvLength) throw new Error('CSV exceeds the 2 MB limit');
    return mergeSheetCsv(await response.text(), registry);
  } finally {
    clearTimeout(timer);
  }
}

export function exportSheetCsv(data: Dataset): string {
  const columns = [...sheetColumns, ...data.metric_definitions.map(m => m.key), 'updated_at'];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = data.hospitals.map(site => columns.map(key =>
    key === 'updated_at' ? data.updated_at : key in site ? site[key as keyof typeof site] : site.metrics[key]));
  return [columns, ...rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
