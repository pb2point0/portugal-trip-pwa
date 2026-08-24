'use client';

import { useEffect, useRef, useState } from 'react';
import { Route, Utensils } from 'lucide-react';
import type { Drive } from './trip-data';
import 'leaflet/dist/leaflet.css';

type OverpassElement = {
  id:number;
  lat?:number;
  lon?:number;
  center?:{lat:number;lon:number};
  tags?:Record<string,string>;
};

const distanceToRoute = (lat:number,lon:number,points:[number,number][]) =>
  Math.min(...points.map(([a,b]) => (a-lat) ** 2 + (b-lon) ** 2));

export default function RouteMap({ drive }: { drive:Drive }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const [roadDriveId,setRoadDriveId] = useState('');
  const [restaurantDriveId,setRestaurantDriveId] = useState('');
  const [routeStatus,setRouteStatus] = useState('Approximate route');
  const roadRequested = roadDriveId===drive.id;
  const restaurantsRequested = restaurantDriveId===drive.id;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled=false;

    async function drawMap() {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;
      mapRef.current?.remove();
      const map=L.map(el.current,{zoomControl:true,scrollWheelZoom:false,attributionControl:true});
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);

      const waypoints=drive.coords.map(([lat,lng])=>L.latLng(lat,lng));
      let routePoints=waypoints;
      if (roadRequested) {
        setRouteStatus('Finding the road route...');
        try {
          const coordinates=drive.coords.map(([lat,lng])=>`${lng},${lat}`).join(';');
          const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,{signal:controller.signal});
          if(!response.ok) throw new Error('Road routing unavailable');
          const result=await response.json() as {routes?:{geometry?:{coordinates:[number,number][]}}[]};
          const routed=result.routes?.[0]?.geometry?.coordinates;
          if(!routed?.length) throw new Error('No route returned');
          routePoints=routed.map(([lng,lat])=>L.latLng(lat,lng));
          setRouteStatus('Following mapped roads');
        } catch {
          if(!controller.signal.aborted) setRouteStatus('Road route unavailable - open directions to navigate');
        }
      } else {
        setRouteStatus('Approximate route');
      }

      L.polyline(routePoints,{color:'#fff',weight:9,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(map);
      L.polyline(routePoints,{color:drive.color,weight:5,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(map);
      waypoints.forEach((point,index)=>{
        const marker=L.circleMarker(point,{radius:index===0?8:6,color:'#fff',weight:3,fillColor:drive.color,fillOpacity:1}).addTo(map);
        const label=document.createElement('span');
        label.textContent=drive.stops[index]??`Stop ${index+1}`;
        marker.bindTooltip(label,{direction:'top'});
      });
      map.fitBounds(L.latLngBounds(routePoints),{padding:[32,32],maxZoom:12});

      if(!restaurantsRequested) return;
      setRouteStatus('Finding restaurants near this drive...');
      try {
        const lats=drive.coords.map(([lat])=>lat);
        const lngs=drive.coords.map(([,lng])=>lng);
        const bbox=[Math.min(...lats)-.04,Math.min(...lngs)-.04,Math.max(...lats)+.04,Math.max(...lngs)+.04].join(',');
        const query=`[out:json][timeout:15];nwr["amenity"="restaurant"]["name"](${bbox});out center 80;`;
        const response=await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,{signal:controller.signal});
        if(!response.ok) throw new Error('Places unavailable');
        const result=await response.json() as {elements?:OverpassElement[]};
        const restaurants=(result.elements??[])
          .map(item=>({...item,point:item.lat!=null&&item.lon!=null?[item.lat,item.lon] as [number,number]:item.center?[item.center.lat,item.center.lon] as [number,number]:null}))
          .filter((item):item is OverpassElement&{point:[number,number]}=>Boolean(item.point&&item.tags?.name))
          .sort((a,b)=>distanceToRoute(a.point[0],a.point[1],drive.coords)-distanceToRoute(b.point[0],b.point[1],drive.coords))
          .filter((item,index,array)=>array.findIndex(other=>other.tags?.name===item.tags?.name)===index)
          .slice(0,10);

        restaurants.forEach(item=>{
          const marker=L.circleMarker(item.point,{radius:7,color:'#fff',weight:2,fillColor:'#c9634c',fillOpacity:1}).addTo(map);
          const popup=document.createElement('div');
          const title=document.createElement('strong');
          title.textContent=item.tags?.name??'Restaurant';
          const link=document.createElement('a');
          link.href=`https://www.google.com/maps/search/?api=1&query=${item.point[0]},${item.point[1]}`;
          link.target='_blank';
          link.rel='noreferrer';
          link.textContent='Open in Maps';
          popup.append(title,document.createElement('br'),link);
          marker.bindPopup(popup);
        });
        setRouteStatus(restaurants.length?`${restaurants.length} nearby restaurants shown`:'No named restaurants found near this route');
      } catch {
        if(!controller.signal.aborted) setRouteStatus('Restaurant layer unavailable - use the town links below');
      }
    }

    void drawMap();
    return ()=>{cancelled=true;controller.abort();mapRef.current?.remove();mapRef.current=null};
  },[drive,roadRequested,restaurantsRequested]);

  return <div className="route-map-shell">
    <div className="map-toolbar" aria-label="Map layers">
      <span><Route size={14}/>{routeStatus}</span>
      <div className="map-layer-actions">
        <button className={roadRequested?'active':''} onClick={()=>setRoadDriveId(roadRequested?'':drive.id)} aria-pressed={roadRequested}><Route size={15}/>{roadRequested?'Hide road route':'Load road route'}</button>
        <button className={restaurantsRequested?'active':''} onClick={()=>setRestaurantDriveId(restaurantsRequested?'':drive.id)} aria-pressed={restaurantsRequested}><Utensils size={15}/>{restaurantsRequested?'Hide restaurants':'Show 10 restaurants'}</button>
      </div>
    </div>
    <p className="map-privacy">Loading either layer sends the selected drive coordinates to public OpenStreetMap services.</p>
    <div ref={el} className="route-map" aria-label={`Map for ${drive.name}`}/>
  </div>;
}
