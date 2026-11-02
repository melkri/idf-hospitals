export const departments = ['75','77','78','91','92','93','94','95'];
export const ghuIds = ['GHU_1','GHU_2','GHU_3','GHU_4','GHU_5','GHU_6'];
export type Metric = {key:string;label:string;unit:string;decimals:number;higher_is_better:boolean|null};
export type Hospital = {id:string;name:string;ghu_id:string;ghu_name:string;city:string;department:string;latitude:number;longitude:number;metrics:Record<string,number|null>;address?:string;identity_source?:string;coordinate_source?:string};
export type Dataset = {updated_at:string;data_status:'demo'|'locations'|'verified';metric_definitions:Metric[];hospitals:Hospital[]};
export function validateData(input:unknown):Dataset {
 const d = input as Dataset;
 const fail = (s:string):never => {throw new Error(s)};
 if(!d || !['demo','locations','verified'].includes(d.data_status) || typeof d.updated_at!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.updated_at) || Number.isNaN(Date.parse(d.updated_at)) || new Date(d.updated_at).toISOString().slice(0,10)!==d.updated_at) fail('Invalid dataset metadata');
 if(!Array.isArray(d.hospitals)||!d.hospitals.length||!Array.isArray(d.metric_definitions)||!d.metric_definitions.length) fail('Dataset must contain hospitals and metric definitions');
 const keys=new Set<string>();
 for(const m of d.metric_definitions){if(!m || typeof m.key!=='string'||!m.key||keys.has(m.key)||typeof m.label!=='string'||typeof m.unit!=='string'||!Number.isInteger(m.decimals)||m.decimals<0||m.decimals>6||![true,false,null].includes(m.higher_is_better)) fail('Invalid metric definition');keys.add(m.key);}
 const ids=new Set<string>(), names=new Map<string,string>();
 for(const h of d.hospitals){
  if(!h || typeof h.id!=='string'||!h.id||ids.has(h.id)) fail('Duplicate or empty hospital ID');ids.add(h.id);
  for(const k of ['name','ghu_name','city'] as const) if(typeof h[k]!=='string'||!h[k].trim()) fail('Missing site metadata');
  if(!ghuIds.includes(h.ghu_id)) fail('Unknown GHU');
  if(names.has(h.ghu_id)&&names.get(h.ghu_id)!==h.ghu_name) fail('Inconsistent GHU name');names.set(h.ghu_id,h.ghu_name);
  if(!departments.includes(h.department)||!Number.isFinite(h.latitude)||!Number.isFinite(h.longitude)||h.latitude<48.1||h.latitude>49.25||h.longitude<1.4||h.longitude>3.6) fail('Invalid coordinates or department');
  if(!h.metrics||typeof h.metrics!=='object'||Array.isArray(h.metrics)) fail('Invalid measures');
  for(const [key,value] of Object.entries(h.metrics)) if(!keys.has(key)||(value!==null&&(typeof value!=='number'||!Number.isFinite(value)))) fail('Invalid numeric measure');
 }
 return d;
}
