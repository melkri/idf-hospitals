import {readFileSync, writeFileSync} from 'node:fs';
import {exportSheetCsv} from '../src/lib/sheet.ts';
import {validateData} from '../src/lib/data.ts';

const data = validateData(JSON.parse(readFileSync('public/data/hospitals.json', 'utf8')));
writeFileSync('public/data/sheet-template.csv', exportSheetCsv(data));
console.log('Sheet template saved to public/data/sheet-template.csv');
