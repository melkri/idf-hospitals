import {readFileSync, writeFileSync} from 'node:fs';

const d = JSON.parse(readFileSync('public/data/hospitals.json', 'utf8'));
const cols = [
  'id', 'name', 'ghu_id', 'ghu_name', 'city', 'department', 'latitude', 'longitude',
  'metric_01', 'metric_02', 'metric_03', 'metric_04', 'metric_05',
  'metric_06', 'metric_07', 'metric_08', 'metric_09', 'metric_10',
  'updated_at'
];

const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

const rows = d.hospitals.map((h, i) => {
  const isSpecialty = h.name.includes('Broca') || h.name.includes('Vaugirard') || h.name.includes('Dupuytren') || h.name.includes('Georges-Clemenceau');
  const sizeFactor = isSpecialty ? 0.4 : (0.6 + ((i * 7) % 10) * 0.1);
  const row = {
    ...h,
    metric_01: Math.round(500 * sizeFactor),
    metric_02: Math.round(20000 * sizeFactor),
    metric_03: isSpecialty ? '' : Math.round(45000 * sizeFactor),
    metric_04: Math.round(110000 * sizeFactor),
    metric_05: Number((5.2 + ((i * 3) % 5) * 0.5).toFixed(1)),
    metric_06: Number((82.0 + ((i * 2) % 8) * 1.8).toFixed(1)),
    metric_07: isSpecialty ? 0 : Math.round(16 * sizeFactor),
    metric_08: Number((280 * sizeFactor).toFixed(1)),
    metric_09: Number((720 * sizeFactor).toFixed(1)),
    metric_10: Number((42.0 + ((i * 4) % 6) * 4.5).toFixed(1)),
    updated_at: '2026-11-03'
  };
  return cols.map(c => quote(row[c]));
});

const csv = [cols.map(quote), ...rows].map(r => r.join(',')).join('\r\n') + '\r\n';
writeFileSync('public/data/example-sheet.csv', csv);
console.log(`Created public/data/example-sheet.csv with ${rows.length} hospital rows.`);
