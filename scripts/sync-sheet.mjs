import {readFileSync, writeFileSync, renameSync} from 'node:fs';
import {fetchSheet} from '../src/lib/sheet.ts';
import {validateData} from '../src/lib/data.ts';

// Optional manual snapshot. Live website updates do not require this command.
try {
  const url = process.env.GOOGLE_SHEET_CSV_URL;
  if (!url) throw new Error('Set GOOGLE_SHEET_CSV_URL to the published Google Sheet CSV URL');
  const target = 'public/data/hospitals.json';
  const registry = validateData(JSON.parse(readFileSync(target, 'utf8')));
  const result = await fetchSheet(url, registry);
  writeFileSync(`${target}.tmp`, JSON.stringify(result, null, 2) + '\n');
  renameSync(`${target}.tmp`, target);
  console.log(`Saved a validated snapshot of ${result.hospitals.length} sites.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Sheet synchronization failed');
  process.exitCode = 1;
}
