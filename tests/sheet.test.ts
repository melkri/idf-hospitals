import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exportSheetCsv, fetchSheet, mergeSheetCsv, publishedSheetUrl} from '../src/lib/sheet.ts';
import {validateData} from '../src/lib/data.ts';

const registry = () => validateData(JSON.parse(readFileSync('public/data/hospitals.json', 'utf8')));
const url = 'https://docs.google.com/spreadsheets/d/e/PUBLISHED_ID/pub?gid=0&single=true&output=csv';

test('template round-trips without mutating registry, including Unicode and quotes', () => {
  const data = registry();
  data.hospitals[0].name = 'Synthetic, "quoted"\nname';
  const before = JSON.stringify(data);
  assert.deepEqual(mergeSheetCsv(exportSheetCsv(data), data), data);
  assert.equal(JSON.stringify(data), before);
});

test('sheet values update by stable ID, preserving registry order, sources and verification status', () => {
  const data = registry();
  const sheet = structuredClone(data);
  sheet.updated_at = '2026-11-03';
  sheet.hospitals[0].metrics.metric_01 = 0;
  sheet.hospitals[1].metrics.metric_01 = 1234.5;
  sheet.hospitals.reverse();
  const merged = mergeSheetCsv(exportSheetCsv(sheet), data);
  assert.equal(merged.updated_at, sheet.updated_at);
  assert.equal(merged.data_status, data.data_status);
  assert.equal(merged.hospitals[0].id, data.hospitals[0].id);
  assert.equal(merged.hospitals[0].metrics.metric_01, 0);
  assert.equal(merged.hospitals[1].metrics.metric_01, 1234.5);
  assert.equal(merged.hospitals[0].coordinate_source, data.hospitals[0].coordinate_source);
  assert.equal(data.hospitals[0].metrics.metric_01, null);
});

for (const [label, change] of Object.entries({
  'missing rows': (d: ReturnType<typeof registry>) => { d.hospitals.pop(); },
  'duplicate IDs': (d: ReturnType<typeof registry>) => { d.hospitals[1].id = d.hospitals[0].id; },
  'unknown IDs': (d: ReturnType<typeof registry>) => { d.hospitals[0].id = 'NEW_SITE'; },
  'changed GHU': (d: ReturnType<typeof registry>) => { d.hospitals[0].ghu_id = 'GHU_99'; },
  'changed coordinates': (d: ReturnType<typeof registry>) => { d.hospitals[0].latitude = 0; },
  'changed names': (d: ReturnType<typeof registry>) => { d.hospitals[0].name = 'Changed'; },
  'invalid dates': (d: ReturnType<typeof registry>) => { d.updated_at = '2026-02-31'; },
})) {
  test(`rejects ${label} and preserves the last data`, () => {
    const data = registry(), before = JSON.stringify(data), sheet = structuredClone(data);
    change(sheet);
    assert.throws(() => mergeSheetCsv(exportSheetCsv(sheet), data));
    assert.equal(JSON.stringify(data), before);
  });
}

test('rejects malformed, duplicate or missing headers and non-numeric values', () => {
  const data = registry(), csv = exportSheetCsv(data);
  for (const invalid of [
    '', '<html>Sign in</html>',
    csv.replace('"metric_01"', '"metric_99"'),
    csv.replace('"metric_02"', '"metric_01"'),
    csv.replace('"metric_01"', '""'),
    csv.replace('"48.788611"', '"not a coordinate"'),
    csv.replace(',"","",""', ',"NaN","",""'),
    csv.replace(',"","",""', ',"Infinity","",""'),
    csv.replace(',"","",""', ',"1,234","",""'),
  ]) assert.throws(() => mergeSheetCsv(invalid, data));
});

test('empty or null cells are unavailable; date may be omitted without pretending a new source date', () => {
  const data = registry();
  const lines = exportSheetCsv(data).trim().split('\r\n').map(line => line.slice(0, line.lastIndexOf(',')));
  const merged = mergeSheetCsv('\ufeff' + lines.join('\r\n').replace(',"","",""', ',"null","",""'), data);
  assert.equal(merged.updated_at, data.updated_at);
  assert.equal(merged.hospitals[0].metrics.metric_01, null);
});

test('accepts published CSV URLs and rejects private edit links or non-Google sources', () => {
  assert.equal(publishedSheetUrl(url), url);
  for (const invalid of ['', 'http://docs.google.com/spreadsheets/d/e/ID/pub?output=csv',
    'https://docs.google.com/spreadsheets/d/ID/edit', url.replace('output=csv', 'output=html'),
    url.replace('docs.google.com', 'docs.google.com.example.com'),
    url.replace('https://', 'https://user:password@')]) assert.throws(() => publishedSheetUrl(invalid));
});

test('fetch validates the response and makes an anonymous CORS request without browser caching', async () => {
  const data = registry();
  const fetcher = (async (_input, options) => {
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.mode, 'cors');
    assert.equal(options?.cache, 'no-store');
    return new Response(exportSheetCsv(data), {headers: {'content-type': 'text/csv'}});
  }) as typeof fetch;
  assert.deepEqual(await fetchSheet(url, data, {fetcher}), data);
});

test('HTTP, HTML, invalid CSV and network failures do not mutate the last valid dataset', async () => {
  const data = registry(), before = JSON.stringify(data);
  for (const fetcher of [
    async () => new Response('Unavailable', {status: 503}),
    async () => new Response('<html>Sign in</html>', {headers: {'content-type': 'text/html'}}),
    async () => new Response('bad,csv'),
    async () => { throw new TypeError('Failed to fetch'); },
  ]) {
    await assert.rejects(fetchSheet(url, data, {fetcher: fetcher as typeof fetch}));
    assert.equal(JSON.stringify(data), before);
  }
});
