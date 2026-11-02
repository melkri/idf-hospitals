import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('CSV importer round trips quoted fields and preserves previous data on failure',()=>{
 const directory=mkdtempSync(join(tmpdir(),'hospital-import-'));
 try{
  mkdirSync(join(directory,'public/data'),{recursive:true});
  const fixture=JSON.parse(readFileSync('public/data/hospitals.json','utf8'));
  fixture.hospitals[0].name='Synthetic, quoted "name"';
  const target=join(directory,'public/data/hospitals.json');
  writeFileSync(target,JSON.stringify(fixture));
  const keys=['id','name','ghu_id','ghu_name','city','department','latitude','longitude',...fixture.metric_definitions.map((m:{key:string})=>m.key)];
  const csv=(rows:typeof fixture.hospitals)=>[keys,...rows.map((h:Record<string,unknown>&{metrics:Record<string,unknown>})=>keys.map(k=>h[k]??h.metrics[k]??''))].map(row=>row.map((v:unknown)=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
  const input=join(directory,'sheet.csv');
  writeFileSync(input,csv(fixture.hospitals));
  const run=()=>spawnSync(process.execPath,['--experimental-strip-types',resolve('scripts/import-csv.ts'),input],{cwd:directory,encoding:'utf8'});
  const valid=run();assert.equal(valid.status,0,valid.stderr);
  const before=readFileSync(target,'utf8');
  assert.equal(JSON.parse(before).hospitals[0].name,fixture.hospitals[0].name);
  fixture.hospitals[1].id=fixture.hospitals[0].id;
  writeFileSync(input,csv(fixture.hospitals));assert.notEqual(run().status,0);assert.equal(readFileSync(target,'utf8'),before);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
