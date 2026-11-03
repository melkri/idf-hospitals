import {parse} from 'csv-parse/browser/esm/sync';
import {validateData, type Dataset} from './data.ts';

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
  const required = [...sheetColumns, ...registry.metric_definitions.map(m => m.key)];
  const allowed = new Set([...required, 'updated_at', 'address']);
  const rows = parse(csv, {
    columns(headers: string[]) {
      if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV columns');
      for (const key of required) if (!headers.includes(key)) throw new Error(`Missing CSV column: ${key}`);
      for (const key of headers) if (!allowed.has(key)) throw new Error(`Unknown CSV column: ${key}`);
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
    imported.set(row.id, Object.fromEntries(registry.metric_definitions.map(metric => {
      const raw = row[metric.key];
      return [metric.key, raw === '' || raw === 'null' ? null : numericCell(raw, `${row.id} ${metric.key}`)];
    })));
  }
  if (dates.size > 1) throw new Error('Use the same updated_at date on every row');
  const updated_at = dates.size ? [...dates][0] : registry.updated_at;
  // Preserve registry order, even when the sheet is sorted differently.
  return validateData({
    ...registry,
    updated_at,
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
