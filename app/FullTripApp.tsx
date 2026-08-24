'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, BadgeCheck, BedDouble, Bus, CalendarDays, CarFront, ChevronRight, Compass, Copy, ExternalLink, FileSpreadsheet, FileText, Heart, House, Languages, ListChecks, LogOut, MapPin, Menu, NotebookText, Plane, Route, Search, Ticket, Train, Upload, Utensils, Volume2, X } from 'lucide-react';
import { defaultDrives, emptyTrip, type BookingItem, type PrivateTripBundle, type ReservationRecord, type Status, type TripDay, type TripPayload } from './trip-data';
import PortugalAi from './PortugalAi';
import TripMark from './TripMark';
import { WeatherForecast } from './trip-live';
import './full-trip.css';
import './trip-live.css';
import './private-trip.css';
import './translator.css';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });
type View = 'today' | 'todo' | 'transport' | 'itinerary' | 'drives' | 'translate';

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

type BookingAction =
  | { kind:'link'; label:string; href:string }
  | { kind:'details'; label:string; reservation?:ReservationRecord }
  | { kind:'transport'; label:string };

function nextDate(date:string) {
  const value = new Date(date+'T12:00:00Z');
  value.setUTCDate(value.getUTCDate()+1);
  return value.toISOString().slice(0,10);
}

function stayRangeFor(itinerary:TripPayload['itinerary'],place:string) {
  const target=place.toLowerCase();
  const days=itinerary.filter((day)=>(day.base+' '+day.sleep).toLowerCase().includes(target));
  if (!days.length) return null;
  return {checkin:days[0].date,checkout:nextDate(days[days.length-1].date)};
}

function stayBookingUrl(place:string,itinerary:TripPayload['itinerary']) {
  const range=stayRangeFor(itinerary,place);
  const params=new URLSearchParams({ss:place+', Portugal',group_adults:'2',no_rooms:'1',group_children:'0',...(range??{})});
  return 'https://www.booking.com/searchresults.html?'+params.toString();
}

function reservationFor(item:BookingItem,reservations:ReservationRecord[]) {
  return item.reservationId?reservations.find((record)=>record.id===item.reservationId):undefined;
}

function bookingActionFor(item:BookingItem,itinerary:TripPayload['itinerary'],reservations:ReservationRecord[]):BookingAction {
  const description=(item.item+' '+item.choice).toLowerCase();
  const reservation=reservationFor(item,reservations);
  if (reservation) return {kind:'details',label:'View details',reservation};
  if (/(train|bus|coach|metro|transport|transfer)/.test(description)) return {kind:'transport',label:'Plan transport'};
  if (/(madeira|funchal|island).*(flight)|flight.*(madeira|funchal|island)/.test(description)) return {kind:'details',label:'Flight details'};
  if (/(lodging|hotel|stay|accommodation)/.test(description)) {
    const place=['Porto','Faro','Funchal','Ponta do Sol'].find((name)=>description.includes(name.toLowerCase()));
    return {kind:'link',label:item.status==='DONE'?'View stay options':'Search stays',href:stayBookingUrl(place??item.item,itinerary)};
  }
  if (item.status==='DONE'&&/(flight|car|rental)/.test(description)) return {kind:'details',label:'View details'};
  if (item.href) return {kind:'link',label:item.action||'Open details',href:item.href};
  return {kind:'link',label:item.action||'Find options',href:'https://www.google.com/search?q='+encodeURIComponent(item.item+' '+item.choice+' Portugal')};
}

function IconForBase() {
  return <MapPin size={18} />;
}

type FullTripAppProps = { supabase:SupabaseClient; userEmail:string; onSignOut:()=>Promise<void> };

export default function FullTripApp({ supabase, userEmail, onSignOut }: FullTripAppProps) {
  const [view, setView] = useState<View>('today');
  const [selectedDriveIndex, setSelectedDriveIndex] = useState(0);
  const [trip, setTrip] = useState<TripPayload>(emptyTrip);
  const [tripId, setTripId] = useState('primary');
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<TripDay | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [daySaveNote, setDaySaveNote] = useState('');
  const [addTransportTodo, setAddTransportTodo] = useState(false);
  const [importNote, setImportNote] = useState('Loading private trip data…');
  const [menuOpen, setMenuOpen] = useState(false);
  const [translateText, setTranslateText] = useState('');
  const [direction, setDirection] = useState<'en-pt'|'pt-en'>('en-pt');
  const fileRef = useRef<HTMLInputElement>(null);
  const privateBundleRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const { itinerary, bookings } = trip;
  const reservations=trip.reservations??[];
  const drives=useMemo(()=>{
    const catalog=new Map(defaultDrives.map((drive)=>[drive.id,drive]));
    (trip.drives??[]).forEach((drive,index)=>catalog.set(drive.id||'private-'+index,drive));
    return Array.from(catalog.values());
  },[trip.drives]);

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
    let cancelled = false;
    async function loadTrip() {
      const { data, error } = await supabase.from('trip_data').select('trip_id, payload, updated_at').order('updated_at', { ascending:false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (data?.payload) {
        const payload = data.payload as TripPayload;
        setTrip({ ...payload, drives: payload.drives ?? [], reservations:payload.reservations??[] });
        setTripId(data.trip_id);
        setExpandedDay(payload.itinerary[0]?.date ?? null);
        setSelectedDriveIndex(0);
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
  const heroTitle = tripPhase === 'during' ? <>Today: <em>{currentTripDay?.base ?? 'Portugal'}.</em></> : tripPhase === 'after' ? <>Trip archive.</> : <>Portugal 2026.<br/><em>Trip plan.</em></>;
  const heroLede = tripPhase === 'during' ? currentTripDay?.plan : `${itinerary.length} days across mainland Portugal and Madeira.`;
  const dateRange = firstDay && lastDay ? `${compactDate(firstDay.date)}–${compactDate(lastDay.date)}` : 'Private dates';
  const routeStops = Array.from(new Set(itinerary.map((day) => day.base).filter(Boolean))).slice(0, 5);
  const activeDriveIndex = selectedDriveIndex < drives.length ? selectedDriveIndex : 0;
  const selectedDrive = drives[activeDriveIndex];
  const portoStay=stayRangeFor(itinerary,'Porto');
  const portoBookingHref=stayBookingUrl('Porto',itinerary);
  const googleTranslateUrl = `https://translate.google.com/?sl=${direction==='en-pt'?'en':'pt'}&tl=${direction==='en-pt'?'pt':'en'}&text=${encodeURIComponent(translateText)}&op=translate`;

  function openView(next:View) {
    setView(next);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      pageRef.current?.scrollTo({top:0,behavior:'smooth'});
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  function speak(text: string, lang = 'pt-PT') {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = .88;
    speechSynthesis.speak(utterance);
  }

  function editDay(day:TripDay) {
    setEditingDay({...day});
    setDaySaveNote('');
    setAddTransportTodo(false);
  }

  function updateDayDraft<K extends keyof TripDay>(field:K,value:TripDay[K]) {
    setEditingDay((current) => current ? {...current,[field]:value} : current);
  }

  function useBookedTransportPreset() {
    setAddTransportTodo(true);
    setEditingDay((current) => {
      if (!current) return current;
      const reminder='Activity is booked; transportation remains to arrange.';
      return {
        ...current,
        transport:'TBD — arrange transportation to/from this activity',
        status:'PLAN',
        note:current.note.includes(reminder) ? current.note : [current.note,reminder].filter(Boolean).join(' '),
      };
    });
  }

  async function saveEditedDay() {
    if (!editingDay) return;
    if (!editingDay.plan.trim()) {
      setDaySaveNote('Add a plan before saving.');
      return;
    }
    setSavingDay(true);
    setDaySaveNote('');
    try {
      let nextBookings=trip.bookings;
      if (addTransportTodo) {
        const dateLabel=compactDate(editingDay.date);
        const hasTransportTask=trip.bookings.some((item) => {
          const description=(item.item+' '+item.choice).toLowerCase();
          return description.includes('transport') && description.includes(dateLabel.toLowerCase());
        });
        if (!hasTransportTask) {
          const shortPlan=editingDay.plan.split(/[—·:]/)[0].trim().slice(0,48) || 'Activity';
          nextBookings=[
            {priority:1,item:shortPlan+' transportation — '+dateLabel,choice:'Arrange transportation to and from this activity',amount:0,status:'PLAN',action:'Plan transport'},
            ...trip.bookings.map((item) => ({...item,priority:item.priority+1})),
          ];
        }
      }
      const nextTrip:TripPayload={
        ...trip,
        itinerary:trip.itinerary.map((day) => day.date===editingDay.date ? editingDay : day),
        bookings:nextBookings,
      };
      const { data:userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('trip_data').upsert({
        trip_id:tripId,
        payload:nextTrip,
        updated_by:userData.user?.id,
      });
      if (error) throw new Error(error.message);
      setTrip(nextTrip);
      setEditingDay(null);
      setImportNote('Private trip data synced · '+fmtDate(editingDay.date)+' updated');
    } catch (error) {
      setDaySaveNote(error instanceof Error ? error.message : 'This day could not be saved.');
    } finally {
      setSavingDay(false);
    }
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
      const payload: TripPayload = { itinerary:next, bookings:importedBookings, budget:importedBudget, drives, reservations:trip.reservations??[] };
      const { data:userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('trip_data').upsert({ trip_id:tripId, payload, updated_by:userData.user?.id });
      if (error) throw new Error(`The workbook was read, but Supabase could not save it: ${error.message}`);
      setTrip(payload);
      setImportNote(`${file.name} securely synced · ${next.length} days refreshed`);
    } catch (error) {
      setImportNote(error instanceof Error ? error.message : 'That workbook could not be read.');
    }
  }


  async function importPrivateBundle(file:File) {
    try {
      setImportNote('Reading private reservation bundle…');
      const bundle=JSON.parse(await file.text()) as PrivateTripBundle;
      if (bundle.version!==1||!Array.isArray(bundle.reservations)) throw new Error('That is not a valid Portugal private bundle.');
      const merged=new Map((trip.reservations??[]).map((record)=>[record.id,record]));
      bundle.reservations.forEach((record)=>merged.set(record.id,record));
      const nextBookings=trip.bookings.map((item)=>{
        const description=(item.item+' '+item.choice).toLowerCase();
        const update=bundle.bookingUpdates?.find((candidate)=>candidate.matchAny.some((token)=>description.includes(token.toLowerCase())));
        if (!update) return item;
        const {matchAny,...fields}=update;
        void matchAny;
        return {...item,...fields};
      });
      const nextTrip:TripPayload={...trip,bookings:nextBookings,reservations:Array.from(merged.values()),drives};
      const {data:userData}=await supabase.auth.getUser();
      const {error}=await supabase.from('trip_data').upsert({trip_id:tripId,payload:nextTrip,updated_by:userData.user?.id});
      if (error) throw new Error(error.message);
      setTrip(nextTrip);
      setImportNote(file.name+' imported · '+bundle.reservations.length+' private reservations connected');
      setMenuOpen(false);
    } catch (error) {
      setImportNote(error instanceof Error?error.message:'The private bundle could not be imported.');
    } finally {
      if (privateBundleRef.current) privateBundleRef.current.value='';
    }
  }

  const nav = [
    { id:'today' as View, label:'Today', icon:House },
    { id:'todo' as View, label:'To-do', icon:ListChecks },
    { id:'itinerary' as View, label:'Trip', icon:CalendarDays },
    ...(drives.length ? [{ id:'drives' as View, label:'Drives', icon:Route }] : []),
    { id:'translate' as View, label:'Translate', icon:Languages },
  ];

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="wordmark" onClick={() => openView('today')} aria-label="Go to trip overview"><TripMark/><div><small>Private trip</small><strong>Portugal</strong></div></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(({id,label}) => <button key={id} className={view===id?'active':''} onClick={() => openView(id)}>{label}</button>)}
        </nav>
        <button className="import-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Refresh from Excel</button>
        <button className="account-button" onClick={() => void onSignOut()} title={`Sign out ${userEmail}`}><span>{userEmail}</span><LogOut size={16}/></button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen?<X/>:<Menu/>}</button>
        <input ref={fileRef} hidden type="file" accept=".xlsx,.xlsm" onChange={(e) => e.target.files?.[0] && void importWorkbook(e.target.files[0])}/>
        <input ref={privateBundleRef} hidden type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && void importPrivateBundle(e.target.files[0])}/>
      </header>

      {menuOpen && <div className="mobile-menu"><button onClick={() => fileRef.current?.click()}><FileSpreadsheet size={18}/>Refresh from Excel</button><button onClick={() => privateBundleRef.current?.click()}><FileText size={18}/>Import private bundle</button><button onClick={() => void onSignOut()}><LogOut size={18}/>Sign out</button><p>{userEmail}<br/>{importNote}</p></div>}

      <div ref={pageRef} className="page-wrap">
        {loadingTrip && <section className="empty-trip"><div className="auth-loader"/><h2>Syncing your private trip…</h2></section>}
        {!loadingTrip && itinerary.length === 0 && <section className="empty-trip"><FileSpreadsheet size={34}/><p className="kicker">Private trip space ready</p><h1>Bring in the workbook.</h1><p>Your itinerary and booking details will be stored in Supabase and shared only with invited travelers.</p><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17}/> Import Excel workbook</button><small>{importNote}</small></section>}
        {!loadingTrip && itinerary.length > 0 && <>
        {view === 'today' && <>
          <section className="hero-grid">
            <div className="hero-copy">
              <p className="kicker"><Heart size={13} fill="currentColor"/> Protected trip space</p>
              <h1>{heroTitle}</h1>
              <p className="hero-lede">{heroLede}</p>
              <div className="hero-actions"><button className="primary" onClick={() => openView('itinerary')}>See the full trip <CalendarDays size={17}/></button>{drives.length > 0 && <button className="secondary" onClick={() => openView('drives')}>Choose a drive <CarFront size={17}/></button>}</div>
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
            <div className="memory-copy"><p className="kicker">Eibsee</p><h2>A favorite trip photo.</h2><p>Us at the lake. Keeping it here because it makes us happy.</p></div>
          </section>
          <section className="todo-teaser" aria-label="Trip to-do summary">
            <button className="todo-teaser-button" onClick={()=>openView('todo')}>
              <span className="todo-teaser-icon"><ListChecks size={22}/></span>
              <span className="todo-teaser-copy"><span className="kicker">To-do</span><strong>{upcomingBookings.length ? upcomingBookings.length+' '+(upcomingBookings.length===1?'thing':'things')+' to finish' : 'Everything important is ready'}</strong><small>Reservations, bookings, and the choices that still need attention.</small></span>
              <span className="todo-teaser-link">Open list <ChevronRight size={17}/></span>
            </button>
            <span className="todo-teaser-meter" aria-label={completion+' percent complete'}><i style={{width:completion+'%'}}/></span>
          </section>
          <WeatherForecast days={previewDays}/>
          <PortugalAi supabase={supabase}/>
          <section className="next-days">
            <div className="section-heading"><div><p className="kicker">{tripPhase==='after'?'Trip archive':'The days ahead'}</p><h2>Trip at a glance.</h2></div><div className="section-heading-actions"><a href={portoBookingHref} target="_blank" rel="noreferrer">Porto stays{portoStay?' · '+compactDate(portoStay.checkin)+'–'+compactDate(portoStay.checkout):''}<ExternalLink size={13}/></a><button onClick={()=>openView('itinerary')}>All {itinerary.length} days →</button></div></div>
            <div className="day-preview">{previewDays.map(day=><article key={day.date}><span>{fmtDate(day.date)}</span><IconForBase/><h3>{day.base}</h3><p>{day.plan}</p><small className={`pill ${statusClass(day.status)}`}>{day.status}</small></article>)}</div>
          </section>
        </>}

        {view === 'todo' && <section className="content-page todo-page">
          <div className="page-title"><p className="kicker">To-do · {completedBookings} of {bookings.length} complete</p><h1>What still needs doing.</h1><p>Bookings, confirmations, and transportation tasks in one place.</p></div>
          <button className="transport-hub-teaser" type="button" onClick={()=>openView('transport')}><span><Bus size={22}/></span><div><strong>Getting around Portugal</strong><small>Trains, buses, Metro, Uber, Bolt, and help booking the Porto leg.</small></div><ChevronRight size={19}/></button>
          <div className="todo-summary">
            <div><span>{upcomingBookings.length} {upcomingBookings.length===1?'item':'items'} open</span><h2>{completion===100?'Ready.':'Next actions.'}</h2></div>
            <strong>{completion}% ready</strong>
            <span className="todo-summary-meter" aria-hidden="true"><i style={{width:completion+'%'}}/></span>
          </div>
          {bookings.length ? <div className="todo-table">{bookings.map((item)=>{
            const action=bookingActionFor(item,itinerary,reservations);
            const bookingKey=item.priority+'-'+item.item;
            const detailsOpen=expandedBooking===bookingKey;
            const complete=item.status==='DONE';
            return <article key={bookingKey} className={'todo-row'+(complete?' completed':'')}>
              <span className="priority">{String(item.priority).padStart(2,'0')}</span>
              <div className="todo-row-copy"><strong>{item.item}</strong><small>{item.choice||'Details not added yet'}</small></div>
              <span className={'pill todo-status '+statusClass(item.status)}>{item.status}</span>
              {action.kind==='link'
                ? <a className="todo-row-action" href={action.href} target="_blank" rel="noreferrer">{action.label}<ExternalLink size={14}/></a>
                : action.kind==='transport'
                  ? <button className="todo-row-action" type="button" onClick={()=>openView('transport')}>{action.label}<ChevronRight size={14}/></button>
                  : <button className="todo-row-action" type="button" aria-expanded={detailsOpen} onClick={()=>setExpandedBooking(detailsOpen?null:bookingKey)}>{detailsOpen?'Close':action.label}<ChevronRight size={14}/></button>}
              {detailsOpen&&action.kind==='details'&&<div className="booking-detail-placeholder">
                {action.reservation?.kind==='flight'?<Plane size={18}/>:action.reservation?.kind==='lodging'?<BedDouble size={18}/>:<CarFront size={18}/>}
                <div>{action.reservation?<><strong>{action.reservation.title}</strong><p>{action.reservation.startDate}{action.reservation.endDate?'–'+action.reservation.endDate:''} · {action.reservation.location}</p>{action.reservation.provider&&<p>Provider: {action.reservation.provider}</p>}{action.reservation.confirmation&&<p>Confirmation: {action.reservation.confirmation}</p>}{action.reservation.pin&&<p>PIN: {action.reservation.pin}</p>}{action.reservation.address&&<p>{action.reservation.address}</p>}{action.reservation.details?.map((detail)=><p key={detail}>{detail}</p>)}{action.reservation.href&&<a href={action.reservation.href} target="_blank" rel="noreferrer">Open private details <ExternalLink size={13}/></a>}</>:<><strong>Confirmation not connected yet.</strong><p>The trip knows this is booked. Import its confirmation when the file is available.</p></>}</div>
              </div>}
            </article>;
          })}</div>:<div className="todo-empty"><ListChecks size={25}/><h2>No to-do items yet.</h2></div>}
          <section className="reservation-library"><div className="booking-head"><div><p className="kicker">Private records</p><h2>Connected reservations</h2></div><button type="button" onClick={()=>privateBundleRef.current?.click()}><Upload size={16}/>Import private bundle</button></div>
            {reservations.length?<div className="reservation-grid">{reservations.map((record)=><article key={record.id}><BadgeCheck size={18}/><div><strong>{record.title}</strong><small>{record.location} · {record.startDate}{record.endDate?'–'+record.endDate:''}</small></div></article>)}</div>:<p className="reservation-empty">No confirmation bundle has been imported yet.</p>}
          </section>
          <div className="privacy-note"><NotebookText size={21}/><div><strong>Reservation files stay private.</strong><p>Import the generated private JSON bundle here. It is saved to protected trip data, not the public site repository.</p></div></div>
        </section>}

        {view === 'transport' && <section className="content-page transport-page">
          <button className="transport-back" type="button" onClick={()=>openView('todo')}><ArrowLeft size={16}/>Back to To-do</button>
          <div className="page-title"><p className="kicker">Getting around</p><h1>Porto transport hub.</h1><p>Use the official operators first. Compare buses when the rail schedule is awkward, and use Metro or a ride app for the last mile.</p></div>
          <div className="transport-lead"><Train size={28}/><div><h2>Book the long legs</h2><p>CP is the national rail operator. Long-distance tickets typically open up to 60 days ahead. Rede Expressos and FlixBus are useful alternatives.</p></div></div>
          <div className="transport-grid">
            <article><Train size={21}/><h3>Trains</h3><p>Search Lisbon/Setúbal–Porto and Porto–Faro on CP. Reserve Alfa Pendular or Intercidades seats.</p><a href="https://www.cp.pt/passageiros/en/buy-tickets" target="_blank" rel="noreferrer">Open CP tickets <ExternalLink size={14}/></a></article>
            <article><Bus size={21}/><h3>Intercity buses</h3><p>Compare direct routes and departure stations before paying.</p><div className="transport-links"><a href="https://rede-expressos.pt/en" target="_blank" rel="noreferrer">Rede Expressos</a><a href="https://www.flixbus.pt/" target="_blank" rel="noreferrer">FlixBus</a></div></article>
            <article><Ticket size={21}/><h3>Porto local transit</h3><p>Andante covers Metro and participating buses. The airport Metro is simple unless luggage or arrival time makes a ride easier.</p><a href="https://andante.pt/" target="_blank" rel="noreferrer">Andante guide <ExternalLink size={14}/></a></article>
            <article><CarFront size={21}/><h3>Uber and Bolt</h3><p>Both operate in Porto. Confirm the pickup pin and license plate; airport pickup areas may differ by terminal signage.</p><div className="transport-links"><a href="https://www.uber.com/global/en/r/airports/opo/pickup/" target="_blank" rel="noreferrer">Uber OPO</a><a href="https://bolt.eu/en/airports/opo/" target="_blank" rel="noreferrer">Bolt OPO</a></div></article>
          </div>
          <div className="porto-booking-row"><BedDouble size={20}/><div><strong>Porto lodging</strong><small>{portoStay?compactDate(portoStay.checkin)+'–'+compactDate(portoStay.checkout):'Trip dates'}</small></div><a href={portoBookingHref} target="_blank" rel="noreferrer">Search Booking.com <ExternalLink size={14}/></a></div>
        </section>}

        {view === 'itinerary' && <section className="content-page">
          <div className="page-title"><p className="kicker">{dateRange} · {itinerary.length} days</p><h1>Full itinerary.</h1><p>Daily plan, lodging, transportation, and notes.</p></div>
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
                <div className="day-detail-actions"><button type="button" onClick={()=>editDay(day)}><NotebookText size={15}/>Edit this day</button></div>
                {editingDay?.date===day.date&&<div className="day-editor" aria-label={'Edit '+fmtDate(day.date)}>
                  <div className="day-editor-heading"><div><p className="kicker">Private day editor</p><h3>{fmtDate(day.date)}</h3></div><button type="button" className="day-editor-preset" onClick={useBookedTransportPreset}>Booked · transport TBD</button></div>
                  <label><span>Plan</span><textarea value={editingDay.plan} onChange={(event)=>updateDayDraft('plan',event.target.value)}/></label>
                  <label><span>Transportation</span><textarea value={editingDay.transport} onChange={(event)=>updateDayDraft('transport',event.target.value)} placeholder="What still needs to be arranged?"/></label>
                  <label><span>Status</span><select value={editingDay.status} onChange={(event)=>updateDayDraft('status',event.target.value as Status)}><option value="PLAN">Plan</option><option value="DONE">Done</option><option value="BOOK NOW">Book now</option><option value="BOOK">Book</option><option value="CHECKOUT">Checkout</option></select></label>
                  <label className="day-editor-note"><span>Note</span><textarea value={editingDay.note} onChange={(event)=>updateDayDraft('note',event.target.value)}/></label>
                  <label className="day-editor-todo"><input type="checkbox" checked={addTransportTodo} onChange={(event)=>setAddTransportTodo(event.target.checked)}/><span>Add transportation to the To-do list</span></label>
                  {daySaveNote&&<p className="day-save-note" role="status">{daySaveNote}</p>}
                  <div className="day-editor-actions"><button type="button" onClick={()=>setEditingDay(null)}>Cancel</button><button type="button" className="primary" disabled={savingDay} onClick={()=>void saveEditedDay()}>{savingDay?'Saving…':'Save day'}</button></div>
                </div>}
              </div>}
            </article>})}</div>
        </section>}

        {view === 'drives' && <section className="content-page drives-page">
          <div className="page-title"><p className="kicker">{drives.length} Madeira routes</p><h1>Driving routes.</h1><p>Select any route. The map loads the road route automatically; each stop includes town and restaurant searches.</p></div>
          <div className="drives-layout">
            <label className="drive-select"><span>Choose a driving route</span><select value={activeDriveIndex} onChange={(event)=>setSelectedDriveIndex(Number(event.target.value))}>{drives.map((drive,index)=><option key={drive.id+'-option-'+index} value={index}>{drive.name} · {drive.duration}</option>)}</select></label>
            <div className="drive-picker">{drives.map((drive,index)=><button type="button" key={drive.id+'-'+index} className={activeDriveIndex===index?'active':''} aria-pressed={activeDriveIndex===index} onClick={()=>setSelectedDriveIndex(index)}><i style={{background:drive.color}}/><div><small>{drive.priority} · {drive.duration}</small><strong>{drive.name}</strong><span>{drive.vibe}</span></div><b>→</b></button>)}</div>
            {selectedDrive &&
            <div className="map-panel">
              <RouteMap key={activeDriveIndex} drive={selectedDrive}/>
              <div className="route-detail"><div><p className="kicker">{selectedDrive.distance} · {selectedDrive.duration}</p><h2>{selectedDrive.name}</h2></div><a href={`https://www.google.com/maps/dir/${selectedDrive.coords.map(([a,b])=>`${a},${b}`).join('/')}`} target="_blank" rel="noreferrer">Open directions <ExternalLink size={15}/></a>
                <div className="stop-line">{selectedDrive.stops.map((stop,i)=><span key={`${stop}-${i}`}><i style={{borderColor:selectedDrive.color}}/>{stop}</span>)}</div>
                <div className="route-notes"><p><b>Why this drive</b>{selectedDrive.note}</p><p><b>Best conditions</b>{selectedDrive.weather}</p></div>
                <section className="stop-guide"><div className="stop-guide-heading"><div><p className="kicker">Along the way</p><h3>Make the towns part of the drive.</h3></div><span>Open any stop for sights or a restaurant shortlist.</span></div>
                  <div className="stop-guide-grid">{selectedDrive.stops.map((stop,i)=><article key={`${stop}-guide-${i}`}><span>{String(i+1).padStart(2,'0')}</span><div><h4>{stop}</h4><p>{selectedDrive.stopNotes?.[i] || (i===0?'Your starting point: get oriented, fill up, and set off without rushing.':i===selectedDrive.stops.length-1?'The final stop and natural place to slow down, eat, or linger before heading back.':'A proper pause between stretches of road. Leave room for the center, a viewpoint, and whatever looks good locally.')}</p><div><a href={`https://www.google.com/maps/search/points+of+interest+in+${encodeURIComponent(`${stop}, Portugal`)}`} target="_blank" rel="noreferrer"><Search size={14}/>Explore</a><a href={`https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(`${stop}, Portugal`)}`} target="_blank" rel="noreferrer"><Utensils size={14}/>Restaurants</a></div></div></article>)}</div>
                </section>
              </div>
            </div>}
          </div>
          <p className="source-note">Road geometry comes from OpenStreetMap routing and is a planning aid. Check closures and conditions before leaving; restaurant searches open Google Maps for the route or a specific town.</p>
        </section>}

        {view === 'translate' && <section className="content-page translate-page">
          <div className="page-title"><p className="kicker">English ↔ European Portuguese</p><h1>Quick translation.</h1><p>Open Google Translate for custom text, or use the offline phrases below.</p></div>
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

      <nav className="bottom-nav" style={{gridTemplateColumns:'repeat('+nav.length+',minmax(0,1fr))'}} aria-label="Mobile navigation">{nav.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>openView(id)}><Icon size={20}/>{label}</button>)}</nav>
    </main>
  );
}
