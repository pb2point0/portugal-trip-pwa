'use client';

import { useEffect, useRef, useState } from 'react';
import { Route, Utensils } from 'lucide-react';
import type { Drive } from './trip-data';
import 'leaflet/dist/leaflet.css';

const roadRoutingPreference='portugal-road-routing-enabled';

export default function RouteMap({ drive }: { drive:Drive }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const [routingEnabled,setRoutingEnabled] = useState(()=>
    typeof window!=='undefined'&&window.localStorage.getItem(roadRoutingPreference)==='true'
  );
  const [routeStatus,setRouteStatus] = useState('Road route not loaded');
  const restaurantSearchUrl='https://www.google.com/maps/search/?api=1&query='+
    encodeURIComponent('restaurants along '+drive.stops.join(', ')+', Portugal');


  useEffect(() => {
    const controller = new AbortController();
    let cancelled=false;

    async function drawMap() {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;

      mapRef.current?.remove();
      const map=L.map(el.current,{zoomControl:true,scrollWheelZoom:false,attributionControl:true});
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:18,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);

      const waypoints=drive.coords.map(([lat,lng])=>L.latLng(lat,lng));
      waypoints.forEach((point,index)=>{
        const marker=L.circleMarker(point,{
          radius:index===0?8:6,
          color:'#fff',
          weight:3,
          fillColor:drive.color,
          fillOpacity:1
        }).addTo(map);
        const label=document.createElement('span');
        label.textContent=drive.stops[index]??'Stop '+(index+1);
        marker.bindTooltip(label,{direction:'top'});
      });
      map.fitBounds(L.latLngBounds(waypoints),{padding:[32,32],maxZoom:12});

      if(!routingEnabled) {
        setRouteStatus('Enable road routes to follow mapped roads');
        return;
      }

      setRouteStatus('Finding the road route...');
      try {
        const coordinates=drive.coords.map(([lat,lng])=>lng+','+lat).join(';');
        const response=await fetch(
          'https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=false',
          {signal:controller.signal}
        );
        if(!response.ok) throw new Error('Road routing unavailable');

        const result=await response.json() as {routes?:{geometry?:{coordinates:[number,number][]}}[]};
        if(cancelled) return;
        const routed=result.routes?.[0]?.geometry?.coordinates;
        if(!routed?.length) throw new Error('No route returned');

        const routePoints=routed.map(([lng,lat])=>L.latLng(lat,lng));
        L.polyline(routePoints,{
          color:'#fff',
          weight:9,
          opacity:.9,
          lineCap:'round',
          lineJoin:'round'
        }).addTo(map);
        L.polyline(routePoints,{
          color:drive.color,
          weight:5,
          opacity:.95,
          lineCap:'round',
          lineJoin:'round'
        }).addTo(map);
        map.fitBounds(L.latLngBounds(routePoints),{padding:[32,32],maxZoom:12});
        setRouteStatus('Following mapped roads');
      } catch {
        if(!controller.signal.aborted) {
          setRouteStatus('Road route unavailable — use Open directions below');
        }
      }
    }

    void drawMap();
    return ()=>{
      cancelled=true;
      controller.abort();
      mapRef.current?.remove();
      mapRef.current=null;
    };
  },[drive,routingEnabled]);

  const enableRoadRouting=()=>{
    window.localStorage.setItem(roadRoutingPreference,'true');
    setRoutingEnabled(true);
  };

  return <div className="route-map-shell">
    <div className="map-toolbar" aria-label="Drive map tools">
      <span aria-live="polite"><Route size={14}/>{routeStatus}</span>
      <div className="map-layer-actions">
        {!routingEnabled&&<button type="button" onClick={enableRoadRouting}>
          <Route size={15}/>Enable road routes
        </button>}
        <a
          className="map-external-link"
          href={restaurantSearchUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={'Find restaurants along '+drive.name+' in Google Maps'}
        >
          <Utensils size={15}/>Restaurants along this drive
        </a>
      </div>
    </div>
    <p className="map-privacy">
      {routingEnabled
        ? 'Road routes are on. Waypoint coordinates are sent to the public OSRM routing service; restaurant search opens Google Maps.'
        : 'Privacy: enabling road routes sends this drive’s waypoint coordinates to router.project-osrm.org. Your choice is remembered on this device.'}
    </p>
    <div
      ref={el}
      className="route-map"
      aria-label={'Road map for '+drive.name}
      aria-busy={routeStatus==='Finding the road route...'}
    />
  </div>;
}
