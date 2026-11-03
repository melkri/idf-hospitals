import {readFileSync, writeFileSync} from 'node:fs';

const d = JSON.parse(readFileSync('public/data/hospitals.json', 'utf8'));

// Human-readable aggregate column names matching the metrics
const metricNames = [
  'Staffed beds',
  'Annual admissions',
  'Emergency visits',
  'Outpatient visits',
  'Average length of stay',
  'Occupancy rate',
  'Operating rooms',
  'Medical workforce',
  'Nursing workforce',
  'Day-case share'
];

const cols = [
  'id', 'name', 'ghu_id', 'ghu_name', 'city', 'department', 'latitude', 'longitude',
  ...metricNames,
  'updated_at'
];

const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

const rows = d.hospitals.map((h, i) => {
  const isSpecialty = h.name.includes('Broca') || h.name.includes('Vaugirard') || h.name.includes('Dupuytren') || h.name.includes('Georges-Clemenceau');
  const sizeFactor = isSpecialty ? 0.4 : (0.6 + ((i * 7) % 10) * 0.1);
  const row = {
    ...h,
    'Staffed beds': Math.round(500 * sizeFactor),
    'Annual admissions': Math.round(20000 * sizeFactor),
    'Emergency visits': isSpecialty ? '' : Math.round(45000 * sizeFactor),
    'Outpatient visits': Math.round(110000 * sizeFactor),
    'Average length of stay': Number((5.2 + ((i * 3) % 5) * 0.5).toFixed(1)),
    'Occupancy rate': Number((82.0 + ((i * 2) % 8) * 1.8).toFixed(1)),
    'Operating rooms': isSpecialty ? 0 : Math.round(16 * sizeFactor),
    'Medical workforce': Number((280 * sizeFactor).toFixed(1)),
    'Nursing workforce': Number((720 * sizeFactor).toFixed(1)),
    'Day-case share': Number((42.0 + ((i * 4) % 6) * 4.5).toFixed(1)),
    updated_at: '2026-11-03'
  };
  return cols.map(c => quote(row[c]));
});

const csv = [cols.map(quote), ...rows].map(r => r.join(',')).join('\r\n') + '\r\n';
writeFileSync('public/data/example-sheet.csv', csv);
console.log(`Created public/data/example-sheet.csv with human-readable aggregate column headers.`);
