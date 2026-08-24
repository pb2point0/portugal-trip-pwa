'use client';

import { useEffect, useRef } from 'react';
import type { Drive } from './trip-data';
import 'leaflet/dist/leaflet.css';

export default function RouteMap({ drive }: { drive: Drive }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !el.current) return;
      if (mapRef.current) mapRef.current.remove();
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      const points = drive.coords.map(([lat, lng]) => L.latLng(lat, lng));
      L.polyline(points, { color: drive.color, weight: 5, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      points.forEach((point, index) => {
        L.circleMarker(point, { radius: index === 0 ? 7 : 5, color: '#f6f7f1', weight: 2, fillColor: drive.color, fillOpacity: 1 })
          .bindTooltip(drive.stops[index], { direction: 'top' }).addTo(map);
      });
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 12 });
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [drive]);

  return <div ref={el} className="route-map" aria-label={`OpenStreetMap route for ${drive.name}`} />;
}
