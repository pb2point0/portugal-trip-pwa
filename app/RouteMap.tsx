'use client';

import { useEffect, useRef, useState } from 'react';
import type { Drive } from './trip-data';
import 'leaflet/dist/leaflet.css';

export default function RouteMap({ drive }: { drive:Drive }) {
  const el=useRef<HTMLDivElement>(null);
  const mapRef=useRef<import('leaflet').Map|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const controller=new AbortController();
    let cancelled=false;
    let wheelCleanup:(()=>void)|undefined;

    async function drawMap(){
      const L=await import('leaflet');
      if(cancelled||!el.current) return;

      mapRef.current?.remove();
      const map=L.map(el.current,{
        zoomControl:true,
        scrollWheelZoom:true,
        attributionControl:true,
        maxBoundsViscosity:.82,
        worldCopyJump:false,
      });
      mapRef.current=map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        minZoom:5,
        maxZoom:18,
        attribution:'&copy; OpenStreetMap contributors',
      }).addTo(map);

      const waypoints=drive.coords.map(([lat,lng])=>L.latLng(lat,lng));
      const routeBounds=L.latLngBounds(waypoints);
      map.setMaxBounds(routeBounds.pad(.8));
      waypoints.forEach((point,index)=>{
        const marker=L.circleMarker(point,{radius:index===0?8:6,color:'#fff',weight:3,fillColor:drive.color,fillOpacity:1}).addTo(map);
        const label=document.createElement('span');
        label.textContent=drive.stops[index]??'Stop '+(index+1);
        marker.bindTooltip(label,{direction:'top'});
      });
      map.fitBounds(routeBounds,{padding:[32,32],maxZoom:12});
      map.setMinZoom(Math.max(5,map.getZoom()-1));

      const mapElement=el.current;
      const handOffAtZoomEdge=(event:WheelEvent)=>{
        const atLowerEdge=event.deltaY>0&&map.getZoom()<=map.getMinZoom();
        const atUpperEdge=event.deltaY<0&&map.getZoom()>=map.getMaxZoom();
        if(atLowerEdge||atUpperEdge){
          map.scrollWheelZoom.disable();
          window.setTimeout(()=>{if(!cancelled)map.scrollWheelZoom.enable();},180);
        } else if(!map.scrollWheelZoom.enabled()) {
          map.scrollWheelZoom.enable();
        }
      };
      mapElement.addEventListener('wheel',handOffAtZoomEdge,{capture:true,passive:true});
      wheelCleanup=()=>mapElement.removeEventListener('wheel',handOffAtZoomEdge,{capture:true});

      try {
        const coordinates=drive.coords.map(([lat,lng])=>lng+','+lat).join(';');
        const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=false',{signal:controller.signal});
        if(!response.ok) throw new Error('Road routing unavailable');
        const result=await response.json() as {routes?:{geometry?:{coordinates:[number,number][]}}[]};
        if(cancelled) return;
        const routed=result.routes?.[0]?.geometry?.coordinates;
        if(!routed?.length) throw new Error('No route returned');
        const routePoints=routed.map(([lng,lat])=>L.latLng(lat,lng));
        L.polyline(routePoints,{color:'#fff',weight:9,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(map);
        L.polyline(routePoints,{color:drive.color,weight:5,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(map);
        const routedBounds=L.latLngBounds(routePoints);
        map.setMaxBounds(routedBounds.pad(.65));
        map.fitBounds(routedBounds,{padding:[32,32],maxZoom:12});
        map.setMinZoom(Math.max(5,map.getZoom()-1));
      } catch {
        // Waypoint markers alone still give a usable map if live road routing fails.
      } finally {
        if(!cancelled)setLoading(false);
      }
    }

    void drawMap();
    return ()=>{
      cancelled=true;
      controller.abort();
      wheelCleanup?.();
      mapRef.current?.remove();
      mapRef.current=null;
    };
  },[drive]);

  return <div className="route-map-shell">
    <div ref={el} className="route-map" aria-label={'Road map for '+drive.name} aria-busy={loading}/>
  </div>;
}
