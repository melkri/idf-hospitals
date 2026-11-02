export const colors=['#006b70','#99621b','#6e55a4','#ae3c68','#2868a6','#617b24'];
export const ghuColor=(id:string)=>colors[Number(id.split('_')[1])-1]||'#7c858c';
export const extent=(values:(number|null|undefined)[])=>{const n=values.filter((v):v is number=>typeof v==='number');return n.length?[Math.min(...n),Math.max(...n)] as const:null;};
export function metricColor(v:number|null|undefined,range:readonly number[]|null){if(v==null||!range)return '#7c858c';const t=range[0]===range[1]?0.5:(v-range[0])/(range[1]-range[0]);return `rgb(${Math.round(218-196*t)},${Math.round(235-134*t)},${Math.round(241-106*t)})`;}
