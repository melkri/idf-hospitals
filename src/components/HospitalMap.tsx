import {useEffect,useRef,useState} from 'react';
import maplibregl from 'maplibre-gl';
import type {Hospital} from '../lib/data';
export default function HospitalMap({all,hospitals,selected,onSelect,color}:{all:Hospital[];hospitals:Hospital[];selected:string|undefined;onSelect:(h:Hospital)=>void;color:(h:Hospital)=>string}){
 const container=useRef<HTMLDivElement>(null), map=useRef<maplibregl.Map|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let m:maplibregl.Map;
  try{m=new maplibregl.Map({container:container.current!,style:import.meta.env.VITE_MAP_STYLE_URL||'https://tiles.openfreemap.org/styles/positron',center:[2.35,48.85],zoom:9,attributionControl:false});}catch{setError(true);return;}
  map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');m.addControl(new maplibregl.AttributionControl({compact:false,customAttribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'}));
  const bounds=new maplibregl.LngLatBounds();all.forEach(h=>bounds.extend([h.longitude,h.latitude]));m.fitBounds(bounds,{padding:70,maxZoom:12,duration:0});
  m.on('error',()=>setError(true));m.on('idle',()=>setError(false));
  const observer=new ResizeObserver(()=>m.resize());observer.observe(container.current!);
  return()=>{observer.disconnect();m.remove();map.current=null;};
 },[all]);
 useEffect(()=>{
  if(!map.current)return;
  const markers=hospitals.map(h=>{const button=document.createElement('button');button.className='hospital-marker'+(selected===h.id?' selected':'');button.style.backgroundColor=color(h);button.setAttribute('aria-label',`View ${h.name}`);button.setAttribute('aria-pressed',String(selected===h.id));button.title=h.name;button.textContent='+';button.onclick=()=>onSelect(h);return new maplibregl.Marker({element:button}).setLngLat([h.longitude,h.latitude]).addTo(map.current!);});
  return()=>markers.forEach(m=>m.remove());
 },[hospitals,selected,onSelect,color]);
 return <><div ref={container} className="map" aria-label="Interactive map of hospital sites"/>{error&&<div className="map-warning" role="status">Basemap unavailable. You can still select sites from the list.</div>}<button className="fit-button" onClick={()=>{const b=new maplibregl.LngLatBounds();hospitals.forEach(h=>b.extend([h.longitude,h.latitude]));if(hospitals.length)map.current?.fitBounds(b,{padding:70,maxZoom:12,duration:0});}}>⌖ Fit visible sites</button></>;
}
