'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BedDouble, CalendarDays, CarFront, CloudSun, Compass, Copy, ExternalLink, FileSpreadsheet, Heart, House, Languages, LogOut, MapPin, Menu, NotebookText, Route, Search, Upload, Utensils, Volume2, X } from 'lucide-react';
import { emptyTrip, type BookingItem, type Status, type TripPayload } from './trip-data';
import PortugalAi from './PortugalAi';
import { WeatherForecast } from './trip-live';
import './full-trip.css';
import './trip-live.css';
import './private-trip.css';
import './translator.css';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });
type View = 'today' | 'itinerary' | 'drives' | 'translate';

const phrases = [
  {en:'Hello! Good morning.',pt:'Olá! Bom dia.',group:'Basics'},
  {en:'Thank you very much.',pt:'Muito obrigado / obrigada.',group:'Basics'},
  {en:'Excuse me, do you speak English?',pt:'Com licença, fala inglês?',group:'Basics'},
  {en:'We are traveling together.',pt:'Estamos a viajar juntos.',group:'Basics'},
  {en:'A table for two, please.',pt:'Uma mesa para dois, por favor.',group:'Food'},
  {en:'What do you recommend?',pt:'O que recomenda?',group:'Food'},
  {en:'We have a reservation.',pt:'Temos uma reserva.',group:'Bookings'},
  {en:'Where can we park?',pt:'Onde podemos estacionar?',group:'Driving'},
  {en:'Could you call us a taxi?',pt:'Pode chamar-nos um táxi?',group:'Getting around'},
  {en:'We need help.',pt:'Precisamos de ajuda.',group:'Emergency'},
];

const statusClass = (status: string) => status.toLowerCase().replace(/\s+/g, '-');
const fmtDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const compactDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const dateInPortugal = () => {
  const parts = new Intl.DateTimeFormat('en-US', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Europe/Lisbon' }).formatToParts(new Date());
  const part = (type:string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

function IconForBase() {
  return <MapPin size={18} />;
}

type FullTripAppProps = { supabase:SupabaseClient; userEmail:string; onSignOut:()=>Promise<void> };

export default function FullTripApp({ supabase, userEmail, onSignOut }: FullTripAppProps) {
  const [view, setView] = useState<View>('today');
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [trip, setTrip] = useState<TripPayload>(emptyTrip);
  const [tripId, setTripId] = useState('primary');
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [importNote, setImportNote] = useState('Loading private trip data…');
  const [menuOpen, setMenuOpen] = useState(false);
  const [translateText, setTranslateText] = useState('');
  const [direction, setDirection] = useState<'en-pt'|'pt-en'>('en-pt');
  const fileRef = useRef<HTMLInputElement>(null);
  const { itinerary, bookings, drives } = trip;

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
    let cancelled = false;
    async function loadTrip() {
      const { data, error } = await supabase.from('trip_data').select('trip_id, payload, updated_at').order('updated_at', { ascending:false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (data?.payload) {
        const payload = data.payload as TripPayload;
        setTrip({ ...payload, drives: payload.drives ?? [] });
        setTripId(data.trip_id);
        setExpandedDay(payload.itinerary[0]?.date ?? null);
        setSelectedDriveId(payload.drives?.[0]?.id ?? '');
        setImportNote(`Private trip data synced · ${payload.itinerary.length} days`);
      } else {
        setImportNote(error ? `Could not sync: ${error.message}` : 'No trip data yet — import the workbook to begin');
      }
      setLoadingTrip(false);
    }
    void loadTrip();
    return () => { cancelled = true; };
  }, [supabase]);

  const upcomingBookings = bookings.filter((item) => item.status !== 'DONE');
  const completedBookings = bookings.filter((item) => item.status === 'DONE').length;
  const completion = bookings.length ? Math.round(completedBookings / bookings.length * 100) : 0;
  const firstDay = itinerary[0];
  const lastDay = itinerary.at(-1);
  const today = dateInPortugal();
  const exactDayIndex = itinerary.findIndex((day) => day.date === today);
  const currentTripDay = exactDayIndex >= 0 ? itinerary[exactDayIndex] : itinerary.find((day) => day.date > today) ?? lastDay;
  const currentDayIndex = Math.max(0,itinerary.indexOf(currentTripDay!));
  const tripPhase = firstDay && today < firstDay.date ? 'before' : lastDay && today > lastDay.date ? 'after' : 'during';
  const daysUntil = firstDay ? Math.max(0, Math.ceil((new Date(`${firstDay.date}T12:00:00Z`).valueOf() - new Date(`${today}T12:00:00Z`).valueOf()) / 86400000)) : 0;
  const previewStart = tripPhase === 'during' ? currentDayIndex : tripPhase === 'after' ? Math.max(0,itinerary.length-4) : 0;
  const previewDays = useMemo(() => itinerary.slice(previewStart,previewStart+4), [itinerary,previewStart]);
  const heroTitle = tripPhase === 'during' ? <>Today in <em>{currentTripDay?.base ?? 'Portugal'}.</em></> : tripPhase === 'after' ? <>Atlantic days.<br/><em>Still ours.</em></> : <>Atlantic days.<br/><em>Just us.</em></>;
  const heroLede = tripPhase === 'during' ? currentTripDay?.plan : tripPhase === 'after' ? `${itinerary.length} private days of tiled cities, scenic roads, and Atlantic beaches—kept here to revisit.` : `${itinerary.length} private days between tiled cities, scenic roads, and Atlantic beaches.`;
  const dateRange = firstDay && lastDay ? `${compactDate(firstDay.date)}–${compactDate(lastDay.date)}` : 'Private dates';
  const routeStops = Array.from(new Set(itinerary.map((day) => day.base).filter(Boolean))).slice(0, 5);
  const selectedDrive = drives.find((drive) => drive.id === selectedDriveId) ?? drives[0];
  const googleTranslateUrl = `https://translate.google.com/?sl=${direction==='en-pt'?'en':'pt'}&tl=${direction==='en-pt'?'pt':'en'}&text=${encodeURIComponent(translateText)}&op=translate`;

  function speak(text: string, lang = 'pt-PT') {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = .88;
    speechSynthesis.speak(utterance);
  }

  async function importWorkbook(file: File) {
    try {
      setImportNote(`Reading ${file.name}…`);
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames.find((name) => name.includes('Final Itinerary'));
      if (!sheetName) throw new Error('The “Final Itinerary” sheet was not found.');
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: false });
      const headerIndex = rows.findIndex((row) => row?.[0] === 'Date' && row?.[3] === 'Plan');
      if (headerIndex < 0) throw new Error('The itinerary header could not be found.');
      const next = rows.slice(headerIndex + 1).filter((row) => row?.[0] && row?.[3]).map((row) => {
        const parsed = new Date(String(row[0]));
        const date = Number.isNaN(parsed.valueOf()) ? String(row[0]) : parsed.toISOString().slice(0, 10);
        return { date, sleep:String(row[1] ?? ''), base:String(row[2] ?? ''), plan:String(row[3] ?? ''), transport:String(row[4] ?? ''), cost:String(row[5] ?? ''), status:String(row[6] ?? 'PLAN') as Status, note:String(row[7] ?? '') };
      }).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date));
      if (!next.length) throw new Error('No itinerary days were found.');

      const numberFrom = (value:unknown) => {
        if (typeof value === 'number') return value;
        const parsed = Number(String(value ?? '').replace(/[$,]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const budgetSheetName = workbook.SheetNames.find((name) => name.includes('Budget'));
      const budgetRows = budgetSheetName ? XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[budgetSheetName], { header:1, raw:true }) : [];
      const travelersRow = budgetRows.find((row) => String(row?.[0] ?? '').trim().toLowerCase() === 'travelers');
      const totalRow = budgetRows.find((row) => String(row?.[0] ?? '').trim().toUpperCase() === 'TOTAL USD');
      const importedBudget = {
        cap: numberFrom(travelersRow?.[5]) || numberFrom(totalRow?.[5]),
        actual: numberFrom(totalRow?.[10]) || numberFrom(totalRow?.[9]) || 0,
        valuePlan: numberFrom(totalRow?.[8]) || numberFrom(totalRow?.[7]) || 0,
      };

      const bookingSheetName = workbook.SheetNames.find((name) => name.includes('Book + Sources'));
      const bookingRows = bookingSheetName ? XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[bookingSheetName], { header:1, raw:true }) : [];
      const bookingHeader = bookingRows.findIndex((row) => String(row?.[0] ?? '').trim() === 'Priority' && String(row?.[1] ?? '').trim() === 'Book');
      const bookingEnd = bookingRows.findIndex((row, index) => index > bookingHeader && !row?.[0] && !row?.[1]);
      const importedBookings: BookingItem[] = bookingHeader < 0 ? [] : bookingRows.slice(bookingHeader + 1, bookingEnd > bookingHeader ? bookingEnd : undefined)
        .filter((row) => row?.[1] && String(row?.[0] ?? '').trim().toUpperCase() !== 'ID')
        .map((row, index) => {
          const rawItem = String(row[1] ?? '').trim();
          return { priority:numberFrom(row[0]) || index + 1, item:rawItem, choice:String(row[2] ?? '').trim(), amount:numberFrom(row[4]) || numberFrom(row[3]), status:String(row[6] ?? 'PLAN').trim().toUpperCase() };
        });
      const payload: TripPayload = { itinerary:next, bookings:importedBookings, budget:importedBudget, drives };
      const { data:userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('trip_data').upsert({ trip_id:tripId, payload, updated_by:userData.user?.id });
      if (error) throw new Error(`The workbook was read, but Supabase could not save it: ${error.message}`);
      setTrip(payload);
      setImportNote(`${file.name} securely synced · ${next.length} days refreshed`);
    } catch (error) {
      setImportNote(error instanceof Error ? error.message : 'That workbook could not be read.');
    }
  }

  const nav = [
    { id:'today' as View, label:'Today', icon:House },
    { id:'itinerary' as View, label:'Trip', icon:CalendarDays },
    ...(drives.length ? [{ id:'drives' as View, label:'Drives', icon:Route }] : []),
    { id:'translate' as View, label:'Translate', icon:Languages },
  ];

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="wordmark" onClick={() => setView('today')} aria-label="Go to trip overview"><span className="trip-mark" aria-hidden="true">
  <svg viewBox="0 0 48 48">
    <circle className="trip-mark-sun" cx="31.5" cy="16.5" r="4.5"/>
    <path className="trip-mark-ray" d="M31.5 7.5v3M31.5 22.5v3M22.5 16.5h3M37.5 16.5h3"/>
    <path className="trip-mark-wave" d="M7 27c5-5 10-5 15 0s10 5 19-1"/>
    <path className="trip-mark-wave trip-mark-wave-soft" d="M7 34c5-4 10-4 15 0s10 4 19-1"/>
  </svg>
</span><div><small>Private trip</small><strong>Portugal</strong></div></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(({id,label}) => <button key={id} className={view===id?'active':''} onClick={() => setView(id)}>{label}</button>)}
        </nav>
        <button className="import-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Refresh from Excel</button>
        <button className="account-button" onClick={() => void onSignOut()} title={`Sign out ${userEmail}`}><span>{userEmail}</span><LogOut size={16}/></button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen?<X/>:<Menu/>}</button>
        <input ref={fileRef} hidden type="file" accept=".xlsx,.xlsm" onChange={(e) => e.target.files?.[0] && void importWorkbook(e.target.files[0])}/>
      </header>

      {menuOpen && <div className="mobile-menu"><button onClick={() => fileRef.current?.click()}><FileSpreadsheet size={18}/>Refresh from Excel</button><button onClick={() => void onSignOut()}><LogOut size={18}/>Sign out</button><p>{userEmail}<br/>{importNote}</p></div>}

      <div className="page-wrap">
        {loadingTrip && <section className="empty-trip"><div className="auth-loader"/><h2>Syncing your private trip…</h2></section>}
        {!loadingTrip && itinerary.length === 0 && <section className="empty-trip"><FileSpreadsheet size={34}/><p className="kicker">Private trip space ready</p><h1>Bring in the workbook.</h1><p>Your itinerary and booking details will be stored in Supabase and shared only with invited travelers.</p><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17}/> Import Excel workbook</button><small>{importNote}</small></section>}
        {!loadingTrip && itinerary.length > 0 && <>
        {view === 'today' && <>
          <section className="hero-grid">
            <div className="hero-copy">
              <p className="kicker"><Heart size={13} fill="currentColor"/> Protected trip space</p>
              <h1>{heroTitle}</h1>
              <p className="hero-lede">{heroLede}</p>
              <div className="hero-actions"><button className="primary" onClick={() => setView('itinerary')}>See the full trip <CalendarDays size={17}/></button>{drives.length > 0 && <button className="secondary" onClick={() => setView('drives')}>Choose a drive <CarFront size={17}/></button>}</div>
            </div>
            <aside className="countdown-card">
              <div className="sun-orbit"><span>{tripPhase==='before'?daysUntil:tripPhase==='during'?currentDayIndex+1:itinerary.length}</span><small>{tripPhase==='during'?'day':'days'}</small></div>
              <p>{tripPhase==='before'?'until the first trip day':tripPhase==='during'?'of this trip':'in this Portugal story'}</p><strong>{tripPhase==='during'&&currentTripDay?`${compactDate(currentTripDay.date)} · ${currentTripDay.base}`:tripPhase==='after'?dateRange:firstDay?`${compactDate(firstDay.date)} · ${firstDay.base}`:'Private itinerary'}</strong>
              <div className="route-dots"><i/><b/><i/><b/><i/></div>
              <div className="mini-route">{routeStops.map((stop) => <span key={stop}>{stop}</span>)}</div>
            </aside>
          </section>
          <section className="editorial-memory" aria-label="A favorite travel memory">
            <div className="memory-photo"><Image
              src="/images/eibsee-portrait.jpg"
              alt="A couple embracing beside the frozen Eibsee lake in winter"
              width={1067}
              height={1600}
              loading="lazy"
              sizes="(max-width: 620px) 100vw, 360px"
            /></div>
            <div className="memory-copy"><p className="kicker">Why we travel</p><h2>A quiet pause between the plans.</h2><p>The itinerary holds the details. The best parts can still happen in the spaces between them.</p></div>
          </section>
          <section className="overview-grid">
            <article className="now-card">
              <div className="section-label"><CloudSun size={16}/> Trip pulse</div>
              <div className="now-head"><div><span>{upcomingBookings.length} {upcomingBookings.length===1?'thing':'things'} still need attention</span><h2>{completion===100?'Everything important is ready.':'Ready, with room to wander.'}</h2></div><span className="progress-ring" style={{background:`conic-gradient(var(--forest) ${completion}%,var(--sky) 0)`}}><i>{completion}%</i></span></div>
              <div className="action-list">{upcomingBookings.slice(0,3).map(item=><article key={item.item}><span className={`status-dot ${statusClass(item.status)}`}/><div><strong>{item.item}</strong><small>{item.choice}</small></div><span>{item.status}</span></article>)}</div>
            </article>
          </section>
          <WeatherForecast days={previewDays}/>
          <PortugalAi supabase={supabase}/>
          <section className="next-days">
            <div className="section-heading"><div><p className="kicker">{tripPhase==='after'?'Favorite final chapters':'The days ahead'}</p><h2>{tripPhase==='during'?'From here, gently.':'Your route at a glance.'}</h2></div><button onClick={()=>setView('itinerary')}>All {itinerary.length} days →</button></div>
            <div className="day-preview">{previewDays.map(day=><article key={day.date}><span>{fmtDate(day.date)}</span><IconForBase/><h3>{day.base}</h3><p>{day.plan}</p><small className={`pill ${statusClass(day.status)}`}>{day.status}</small></article>)}</div>
          </section>
        </>}

        {view === 'itinerary' && <section className="content-page">
          <div className="page-title"><p className="kicker">{dateRange} · {itinerary.length} days</p><h1>The whole journey.</h1><p>One clear idea for every day: where you are, what the day is for, and the few details worth remembering.</p></div>
          <div className="itinerary-list">{itinerary.map((day,index)=>{
            const open=expandedDay===day.date; const prev=itinerary[index-1]; const newPlace=!prev||prev.base!==day.base;
            return <article key={day.date} className={`day-row ${open?'open':''}`}>
              <button onClick={()=>setExpandedDay(open?null:day.date)} aria-expanded={open}>
                <div className="day-number"><span>Day {String(index+1).padStart(2,'0')}</span><strong>{fmtDate(day.date)}</strong></div>
                <div className="day-main"><div className="day-place"><MapPin size={15}/><span>{newPlace?'Arrive in':'Based in'} {day.base}</span></div><h2>{day.plan}</h2><p>{day.sleep ? `Overnight: ${day.sleep}` : day.base}{day.cost ? ` · ${day.cost}` : ''}</p></div>
                <span className={`pill ${statusClass(day.status)}`}>{day.status}</span>
              </button>
              {open&&<div className="day-details">
                <div className="day-detail-card day-plan-card"><Compass size={19}/><span><b>The shape of the day</b>{day.plan}</span></div>
                <div className="day-detail-card"><BedDouble size={18}/><span><b>Home base</b>{day.sleep || day.base}</span></div>
                <div className="day-detail-card"><NotebookText size={18}/><span><b>Worth remembering</b>{day.note || 'No extra planning note for this day.'}</span></div>
                {day.transport&&<div className="travel-note"><CarFront size={16}/><span><b>Travel note</b>{day.transport}</span></div>}
              </div>}
            </article>})}</div>
        </section>}

        {view === 'drives' && <section className="content-page drives-page">
          <div className="page-title"><p className="kicker">Flexible route days</p><h1>Drive what the day gives you.</h1><p>Pick by weather and energy. Routes now follow mapped roads, and you can reveal ten nearby restaurants without leaving the drive.</p></div>
          <div className="drives-layout">
            <div className="drive-picker">{drives.map(drive=><button key={drive.id} className={selectedDrive?.id===drive.id?'active':''} onClick={()=>setSelectedDriveId(drive.id)}><i style={{background:drive.color}}/><div><small>{drive.priority} · {drive.duration}</small><strong>{drive.name}</strong><span>{drive.vibe}</span></div><b>→</b></button>)}</div>
            {selectedDrive &&
            <div className="map-panel">
              <RouteMap drive={selectedDrive}/>
              <div className="route-detail"><div><p className="kicker">{selectedDrive.distance} · {selectedDrive.duration}</p><h2>{selectedDrive.name}</h2></div><a href={`https://www.google.com/maps/dir/${selectedDrive.coords.map(([a,b])=>`${a},${b}`).join('/')}`} target="_blank" rel="noreferrer">Open directions <ExternalLink size={15}/></a>
                <div className="stop-line">{selectedDrive.stops.map((stop,i)=><span key={`${stop}-${i}`}><i style={{borderColor:selectedDrive.color}}/>{stop}</span>)}</div>
                <div className="route-notes"><p><b>Why this drive</b>{selectedDrive.note}</p><p><b>Best conditions</b>{selectedDrive.weather}</p></div>
                <section className="stop-guide"><div className="stop-guide-heading"><div><p className="kicker">Along the way</p><h3>Make the towns part of the drive.</h3></div><span>Open any stop for sights or a restaurant shortlist.</span></div>
                  <div className="stop-guide-grid">{selectedDrive.stops.map((stop,i)=><article key={`${stop}-guide-${i}`}><span>{String(i+1).padStart(2,'0')}</span><div><h4>{stop}</h4><p>{selectedDrive.stopNotes?.[i] || (i===0?'Your starting point: get oriented, fill up, and set off without rushing.':i===selectedDrive.stops.length-1?'The final stop and natural place to slow down, eat, or linger before heading back.':'A proper pause between stretches of road. Leave room for the center, a viewpoint, and whatever looks good locally.')}</p><div><a href={`https://www.google.com/maps/search/points+of+interest+in+${encodeURIComponent(`${stop}, Portugal`)}`} target="_blank" rel="noreferrer"><Search size={14}/>Explore</a><a href={`https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(`${stop}, Portugal`)}`} target="_blank" rel="noreferrer"><Utensils size={14}/>Restaurants</a></div></div></article>)}</div>
                </section>
              </div>
            </div>}
          </div>
          <p className="source-note">Road geometry comes from OpenStreetMap routing and is a planning aid. Check closures and conditions before leaving; restaurant pins are nearby named places, not a rating-based ranking.</p>
        </section>}

        {view === 'translate' && <section className="content-page translate-page">
          <div className="page-title"><p className="kicker">English ↔ European Portuguese</p><h1>Say it with confidence.</h1><p>Type anything for Google Translate, or use the essentials below offline. Tap the speaker to hear the Portuguese aloud.</p></div>
          <div className="translator-card">
            <div className="language-switch"><button className={direction==='en-pt'?'active':''} onClick={()=>setDirection('en-pt')}>English → Portuguese</button><button className={direction==='pt-en'?'active':''} onClick={()=>setDirection('pt-en')}>Portuguese → English</button></div>
            <textarea value={translateText} onChange={e=>setTranslateText(e.target.value)} placeholder={direction==='en-pt'?'Type what you want to say…':'Escreva o que ouviu…'} aria-label="Text to translate"/>
            <div className="translator-actions"><span>{translateText.length}/500</span><a className={translateText?'':'disabled'} href={translateText?googleTranslateUrl:undefined} target="_blank" rel="noreferrer">Translate with Google <ExternalLink size={16}/></a></div>
            <p className="translator-note">This opens the official Google Translate page. No paid API key or traveler text is stored in this app.</p>
          </div>
          <div className="phrase-head"><div><p className="kicker">Offline phrasebook</p><h2>Small phrases, big help.</h2></div><span>Portugal pronunciation</span></div>
          <div className="phrase-grid">{phrases.map(phrase=><article key={phrase.en}><small>{phrase.group}</small><p>{phrase.en}</p><strong>{phrase.pt}</strong><div><button onClick={()=>speak(phrase.pt)} aria-label={`Speak ${phrase.pt}`}><Volume2 size={16}/>Speak</button><button onClick={()=>void navigator.clipboard.writeText(phrase.pt)} aria-label={`Copy ${phrase.pt}`}><Copy size={16}/>Copy</button></div></article>)}</div>
        </section>}
        </>}
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">{nav.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>{setView(id);scrollTo({top:0,behavior:'smooth'})}}><Icon size={20}/>{label}</button>)}</nav>
    </main>
  );
}
