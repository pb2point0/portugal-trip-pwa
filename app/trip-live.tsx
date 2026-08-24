'use client';

import { useEffect, useMemo, useState } from 'react';
import { CarFront, Cloud, CloudRain, ExternalLink, Footprints, Navigation, Sun, Umbrella } from 'lucide-react';
import type { TripDay } from './trip-data';

type Place = { name:string; lat:number; lng:number; timezone:string };
const WEATHER_CACHE_KEY = 'trip-weather-v2-fahrenheit';
const placeAliases:Record<string,Place> = {
  ewr: { name:'Newark', lat:40.6895, lng:-74.1745, timezone:'America/New_York' },
  newark: { name:'Newark', lat:40.6895, lng:-74.1745, timezone:'America/New_York' },
  'newark liberty': { name:'Newark', lat:40.6895, lng:-74.1745, timezone:'America/New_York' },
};
function cachedForecast() {
  if (typeof window === 'undefined') return {};
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) ?? 'null') as {savedAt:number; data:Record<string,Forecast>} | null;
    return cached && Date.now() - cached.savedAt < 3 * 60 * 60 * 1000 ? cached.data : {};
  } catch { return {}; }
}

type Forecast = { date:string; code:number; high:number; low:number; rain:number; place:string };

const placeRequests = new Map<string,Promise<Place|null>>();
function placeFor(base:string) {
  const key = base.trim().toLowerCase();
  const alias = placeAliases[key];
  if (alias) return Promise.resolve(alias);
  const existing = placeRequests.get(key);
  if (existing) return existing;
  const request = (async () => {
    const params = new URLSearchParams({name:base,count:'1',language:'en',format:'json',countryCode:'PT'});
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) return null;
    const payload = await response.json() as {results?:Array<{name:string;latitude:number;longitude:number;timezone?:string}>};
    const result = payload.results?.[0];
    return result ? {name:result.name,lat:result.latitude,lng:result.longitude,timezone:result.timezone ?? 'Europe/Lisbon'} : null;
  })().catch(() => null);
  placeRequests.set(key,request);
  return request;
}

function weatherCopy(code:number) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Misty';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Wintry';
  if (code <= 82) return 'Showers';
  return 'Storm risk';
}

function WeatherIcon({ code }: { code:number }) {
  if (code === 0) return <Sun size={21}/>;
  if (code <= 3) return <Cloud size={21}/>;
  if (code >= 51) return <CloudRain size={21}/>;
  return <Umbrella size={21}/>;
}

export function WeatherForecast({ days }: { days:TripDay[] }) {
  const [forecast, setForecast] = useState<Record<string,Forecast>>(cachedForecast);
  const [status, setStatus] = useState('Checking the Atlantic forecast…');
  const requested = useMemo(() => days.slice(0,4), [days]);

  useEffect(() => {
    if (!requested.length) return;
    let cancelled = false;

    async function load() {
      try {
        const resolved = await Promise.all(requested.map(async (day) => [day.base,await placeFor(day.base)] as const));
        const placesByBase = new Map(resolved);
        const uniquePlaces = [...new Map(resolved.filter((item):item is readonly [string,Place] => Boolean(item[1])).map(([,place]) => [`${place.lat},${place.lng}`,place])).values()];
        const results = await Promise.all(uniquePlaces.map(async (place) => {
          const params = new URLSearchParams({
            latitude:String(place.lat), longitude:String(place.lng), timezone:place.timezone, forecast_days:'16',
            temperature_unit:'fahrenheit',
            daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!response.ok) throw new Error('Weather service unavailable');
          return { place, payload:await response.json() as {daily?:{time:string[];weather_code:number[];temperature_2m_max:number[];temperature_2m_min:number[];precipitation_probability_max:number[]}} };
        }));
        const next:Record<string,Forecast> = {};
        for (const day of requested) {
          const place = placesByBase.get(day.base);
          const result = place ? results.find((item) => item.place.lat === place.lat && item.place.lng === place.lng) : undefined;
          const index = result?.payload.daily?.time.indexOf(day.date) ?? -1;
          if (place && index >= 0 && result?.payload.daily) next[day.date] = {
            date:day.date, place:place.name, code:result.payload.daily.weather_code[index],
            high:Math.round(result.payload.daily.temperature_2m_max[index]), low:Math.round(result.payload.daily.temperature_2m_min[index]),
            rain:result.payload.daily.precipitation_probability_max[index] ?? 0,
          };
        }
        if (cancelled) return;
        const loadedCount = Object.keys(next).length;
        setForecast(next);
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({savedAt:Date.now(),data:next}));
        setStatus(loadedCount ? 'Fresh forecast for '+loadedCount+' of '+requested.length+' days · temperatures in °F' : 'Forecasts appear 16 days before each date');
      } catch {
        if (!cancelled) setStatus('Offline · showing the last saved forecast when available');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [requested]);

  return <section className="weather-section" aria-labelledby="weather-title">
    <div className="section-heading"><div><p className="kicker">Live trip weather</p><h2 id="weather-title">Pack for the day, not the season.</h2></div><small>{status}</small></div>
    <div className="weather-grid">{requested.map((day) => {
      const item = forecast[day.date];
      return <article key={day.date} className={!item?'forecast-pending':''}>
        <span>{new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${day.date}T12:00:00Z`))}</span>
        {item ? <><WeatherIcon code={item.code}/><div><strong>{item.high}°F</strong><small>{item.low}°F low</small></div><p>{weatherCopy(item.code)} · {item.rain}% rain</p><b>{item.place}</b></> : <><Cloud size={21}/><div><strong>—</strong><small>Forecast pending</small></div><p>Live forecast available up to 16 days ahead</p><b>{day.base}</b></>}
      </article>;
    })}</div>
  </section>;
}

function mapsUrl(destination:string, mode:'walking'|'driving') {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${destination}, Portugal`)}&travelmode=${mode}`;
}

export function MobilityPanel({ day }: { day:TripDay }) {
  return <div className="mobility-panel">
    <div className="mobility-head"><div><b>Get to {day.base}</b><span>Live travel times open from your current location.</span></div></div>
    <div className="mobility-options">
      <a href={mapsUrl(day.base,'walking')} target="_blank" rel="noreferrer"><Footprints size={18}/><span><b>Walking time</b><small>Open live route</small></span><ExternalLink size={14}/></a>
      <a href={mapsUrl(day.base,'driving')} target="_blank" rel="noreferrer"><CarFront size={18}/><span><b>Driving time</b><small>Includes live traffic</small></span><ExternalLink size={14}/></a>
      <a href="https://bolt.eu/en/cities/" target="_blank" rel="noreferrer"><Navigation size={18}/><span><b>Check Bolt</b><small>Live fare in Bolt</small></span><ExternalLink size={14}/></a>
    </div>
    <small className="mobility-disclaimer">Bolt prices stay in Bolt because they change with demand, traffic, and pickup location.</small>
  </div>;
}
