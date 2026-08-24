'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CalendarDays, CarFront, CircleDollarSign, CloudSun, Copy, Download, ExternalLink, FileSpreadsheet, Heart, House, Languages, LogOut, Luggage, Map, MapPin, Menu, Route, Upload, Volume2, WalletCards, X } from 'lucide-react';
import { emptyTrip, type BookingItem, type Status, type TripPayload } from './trip-data';
import PortugalAi from './PortugalAi';
import { MobilityPanel, WeatherForecast } from './trip-live';
import './full-trip.css';
import './trip-live.css';
import './private-trip.css';
import './translator.css';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });
type View = 'today' | 'itinerary' | 'drives' | 'budget' | 'translate';

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
const formatMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
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
  const { itinerary, bookings, budget, drives } = trip;

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

  const remaining = budget.cap - budget.actual;
  const upcomingBookings = bookings.filter((item) => item.status !== 'DONE');
  const completedBookings = bookings.filter((item) => item.status === 'DONE').length;
  const completion = bookings.length ? Math.round(completedBookings / bookings.length * 100) : 0;
  const budgetProgress = budget.cap > 0 ? Math.min(100, Math.max(0, budget.actual / budget.cap * 100)) : 0;
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
    { id:'budget' as View, label:'Budget', icon:WalletCards },
    { id:'translate' as View, label:'Translate', icon:Languages },
  ];

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="wordmark" onClick={() => setView('today')} aria-label="Go to trip overview"><span>P</span><div><small>Private trip</small><strong>Portugal</strong></div></button>
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
        {!loadingTrip && itinerary.length === 0 && <section className="empty-trip"><FileSpreadsheet size={34}/><p className="kicker">Private trip space ready</p><h1>Bring in the workbook.</h1><p>Your itinerary, bookings, and budget will be stored in Supabase and shared only with invited travelers.</p><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17}/> Import Excel workbook</button><small>{importNote}</small></section>}
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
          <section className="overview-grid">
            <article className="now-card">
              <div className="section-label"><CloudSun size={16}/> Trip pulse</div>
              <div className="now-head"><div><span>{upcomingBookings.length} {upcomingBookings.length===1?'thing':'things'} still need attention</span><h2>{completion===100?'Everything important is ready.':'Ready, with room to wander.'}</h2></div><span className="progress-ring" style={{background:`conic-gradient(var(--forest) ${completion}%,var(--sky) 0)`}}><i>{completion}%</i></span></div>
              <div className="action-list">{upcomingBookings.slice(0,3).map(item=><button key={item.item} onClick={()=>setView('budget')}><span className={`status-dot ${statusClass(item.status)}`}/><div><strong>{item.item}</strong><small>{item.choice}</small></div><span>{item.status}</span></button>)}</div>
            </article>
            <article className="budget-snapshot">
              <div className="section-label"><CircleDollarSign size={16}/> Remaining-trip budget</div>
              <strong>{formatMoney(remaining)}</strong><span>left of {formatMoney(budget.cap)}</span>
              <div className="budget-bar"><i style={{width:`${budgetProgress}%`}}/></div>
              <div className="split"><span><b>{formatMoney(budget.actual)}</b> paid / reported</span><span><b>{formatMoney(budget.cap)}</b> cap</span></div>
              <button onClick={()=>setView('budget')}>Open budget <ExternalLink size={15}/></button>
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
          <div className="page-title"><p className="kicker">{dateRange} · {itinerary.length} days</p><h1>The whole journey.</h1><p>Your protected day-by-day itinerary. Tap any day for transportation and planning notes.</p></div>
          <div className="itinerary-list">{itinerary.map((day,index)=>{
            const open=expandedDay===day.date; const prev=itinerary[index-1]; const newPlace=!prev||prev.base!==day.base;
            return <article key={day.date} className={`day-row ${open?'open':''}`}>
              <button onClick={()=>setExpandedDay(open?null:day.date)} aria-expanded={open}>
                <div className="timeline"><span>{fmtDate(day.date).split(',')[0]}</span><i className={newPlace?'place':''}/></div>
                <div className="day-main"><small>{day.sleep} · {day.cost}</small><h2>{day.base}</h2><p>{day.plan}</p></div>
                <span className={`pill ${statusClass(day.status)}`}>{day.status}</span>
              </button>
              {open&&<div className="day-details"><div><Luggage size={17}/><span><b>Getting there</b>{day.transport}</span></div><div><Map size={17}/><span><b>Keep in mind</b>{day.note}</span></div><MobilityPanel day={day}/></div>}
            </article>})}</div>
        </section>}

        {view === 'drives' && <section className="content-page drives-page">
          <div className="page-title"><p className="kicker">Flexible route days</p><h1>Drive what the day gives you.</h1><p>Pick by weather and energy—not by date. The map highlights each protected route option; road lines are planning guides, not turn-by-turn navigation.</p></div>
          <div className="drives-layout">
            <div className="drive-picker">{drives.map(drive=><button key={drive.id} className={selectedDrive?.id===drive.id?'active':''} onClick={()=>setSelectedDriveId(drive.id)}><i style={{background:drive.color}}/><div><small>{drive.priority} · {drive.duration}</small><strong>{drive.name}</strong><span>{drive.vibe}</span></div><b>→</b></button>)}</div>
            {selectedDrive &&
            <div className="map-panel">
              <RouteMap drive={selectedDrive}/>
              <div className="route-detail"><div><p className="kicker">{selectedDrive.distance} · {selectedDrive.duration}</p><h2>{selectedDrive.name}</h2></div><a href={`https://www.google.com/maps/dir/${selectedDrive.coords.map(([a,b])=>`${a},${b}`).join('/')}`} target="_blank" rel="noreferrer">Open directions <ExternalLink size={15}/></a>
                <div className="stop-line">{selectedDrive.stops.map((stop,i)=><span key={`${stop}-${i}`}><i style={{borderColor:selectedDrive.color}}/>{stop}</span>)}</div>
                <div className="route-notes"><p><b>Road note</b>{selectedDrive.note}</p><p><b>Best conditions</b>{selectedDrive.weather}</p></div>
              </div>
            </div>}
          </div>
          <p className="source-note">Route ideas use official local tourism guidance. Always check official trail and road status the evening before and ignore unsafe GPS shortcuts.</p>
        </section>}

        {view === 'budget' && <section className="content-page budget-page">
          <div className="page-title"><p className="kicker">Protected workbook budget</p><h1>Spend with confidence.</h1><p>The cap and actuals below are loaded only after authentication and update whenever you refresh from the workbook.</p></div>
          <div className="budget-hero"><div><small>Reported spend</small><strong>{formatMoney(budget.actual)}</strong><span>of {formatMoney(budget.cap)} cap</span></div><div className="big-bar"><i style={{width:`${budgetProgress}%`}}/></div><div className="budget-stats"><span><small>Remaining</small><b>{formatMoney(remaining)}</b></span><span><small>Value-plan total</small><b>{formatMoney(budget.valuePlan)}</b></span><span><small>Completed bookings</small><b>{completedBookings} of {bookings.length}</b></span></div></div>
          <div className="booking-head"><div><p className="kicker">Booking order</p><h2>What’s done—and what’s next.</h2></div><button onClick={()=>fileRef.current?.click()}><Download size={16}/>Import newest workbook</button></div>
          <div className="booking-table">{bookings.map(item=><article key={item.item}><span className="priority">{String(item.priority).padStart(2,'0')}</span><div><strong>{item.item}</strong><small>{item.choice}</small>{item.href&&<a href={item.href} target="_blank" rel="noreferrer">{item.action} <ExternalLink size={12}/></a>}</div><b>{formatMoney(item.amount)}</b><span className={`pill ${statusClass(item.status)}`}>{item.status}</span></article>)}</div>
          <div className="privacy-note"><FileSpreadsheet size={24}/><div><strong>Your workbook is processed in this browser.</strong><p>Only the trip data is sent to your protected Supabase table, where row-level security limits access to invited travelers.</p><small>{importNote}</small></div></div>
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
