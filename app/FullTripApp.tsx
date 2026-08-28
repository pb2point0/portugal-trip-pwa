'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, BedDouble, Bus, CalendarDays, CarFront, Check, ChevronRight, Compass, Copy, ExternalLink, FileSpreadsheet, Heart, House, Languages, ListChecks, LogOut, MapPin, Menu, MessageCircle, NotebookText, Plane, Route, Send, Ticket, Train, Upload, Utensils, Volume2, X } from 'lucide-react';
import { emptyTrip, type BookingItem, type PlanComment, type ReservationRecord, type Status, type TripDay, type TripPayload } from './trip-data';
import { parseWorkbook } from './importWorkbook';
import { functionError } from './functionError';
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
const normalizeStatus = (status:unknown):Status => String(status).trim().toUpperCase()==='DONE' ? 'DONE' : 'BOOK';
const normalizeTrip = (payload:TripPayload):TripPayload => ({
  ...payload,
  itinerary:(payload.itinerary??[]).map((day)=>({...day,status:normalizeStatus(day.status)})),
  bookings:(payload.bookings??[]).map((item)=>({...item,status:normalizeStatus(item.status)})),
  drives:payload.drives??[],
  reservations:payload.reservations??[],
  comments:payload.comments??[],
});
const fmtDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const compactDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const dateOnDevice = () => {
  const now=new Date();
  const pad=(value:number)=>String(value).padStart(2,'0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
};
const mapsSearchUrl=(place:string)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place+', Portugal');
const commentId=(fallback:string)=>typeof crypto.randomUUID==='function'?crypto.randomUUID():fallback+'-'+Date.now();
const displayName=(email:string)=>{
  const name=email.split('@')[0]?.split(/[._-]/)[0]||'Traveler';
  return name.charAt(0).toUpperCase()+name.slice(1);
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
  if (reservation?.actionLabel&&reservation?.actionUrl) return {kind:'link',label:reservation.actionLabel,href:reservation.actionUrl};
  if (reservation) return {kind:'details',label:'View details',reservation};
  if (/(train|bus|coach|metro|transport|transfer)/.test(description)) return {kind:'transport',label:'Plan transport'};
  if (item.href) return {kind:'link',label:item.action||'Open details',href:item.href};
  return {kind:'link',label:item.action||'Find options',href:'https://www.google.com/search?q='+encodeURIComponent(item.item+' '+item.choice+' Portugal')};
}

function reservationIcon(record?:ReservationRecord) {
  if (record?.kind==='flight') return <Plane size={18}/>;
  if (record?.kind==='lodging') return <BedDouble size={18}/>;
  if (record?.kind==='car') return <CarFront size={18}/>;
  if (record?.kind==='transport') return <Train size={18}/>;
  return <NotebookText size={18}/>;
}

function ReservationDetails({record}:{record:ReservationRecord}) {
  const when=record.startDate+(record.startTime?' · '+record.startTime:'')+(record.endDate&&record.endDate!==record.startDate?' – '+record.endDate:'')+(record.endTime?' · '+record.endTime:'');
  const mapHref=record.address?mapsSearchUrl(record.address):undefined;
  return <article className="reservation-detail-card">
    <strong>{record.kind==='car'?'Rental car':record.title}</strong>
    <p>{when} · {record.location}</p>
    {record.provider&&<p>Provider: {record.provider}</p>}
    {record.confirmation&&<p>Confirmation: {record.confirmation}</p>}
    {record.pin&&<p>PIN: {record.pin}</p>}
    {record.address&&<p>{record.address}</p>}
    {record.bookedUnder&&<p>Booked under: {record.bookedUnder}</p>}
    {record.details?.map((detail)=><p key={detail}>{detail}</p>)}
    <div className="reservation-detail-actions">
      {record.actionLabel&&record.actionUrl&&<a href={record.actionUrl} target="_blank" rel="noreferrer">{record.actionLabel} <ExternalLink size={13}/></a>}
      {!record.actionUrl&&mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">Map <MapPin size={13}/></a>}
    </div>
  </article>;
}
function IconForBase() {
  return <MapPin size={18} />;
}

type FullTripAppProps = { supabase:SupabaseClient; userEmail:string; onSignOut:()=>Promise<void> };

export default function FullTripApp({ supabase, userEmail, onSignOut }: FullTripAppProps) {
  const [view, setView] = useState<View>('today');
  const [selectedDriveIndex, setSelectedDriveIndex] = useState(0);
  const [driveCardOrder, setDriveCardOrder] = useState<number[]>([]);
  const [trip, setTrip] = useState<TripPayload>(emptyTrip);
  const [tripId, setTripId] = useState('primary');
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [expandedReservation, setExpandedReservation] = useState<string | null>(null);
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [commentDrafts,setCommentDrafts] = useState<Record<string,string>>({});
  const [savingComment,setSavingComment] = useState<string|null>(null);
  const [planningOpen,setPlanningOpen] = useState<Record<string,boolean>>({});
  const [planSaveNote,setPlanSaveNote] = useState('');
  const [importNote, setImportNote] = useState('Loading our honeymoon…');
  const [menuOpen, setMenuOpen] = useState(false);
  const [translateText, setTranslateText] = useState('');
  const [direction, setDirection] = useState<'en-pt'|'pt-en'>('en-pt');
  const [translation, setTranslation] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const { itinerary, bookings } = trip;
  const reservations=trip.reservations??[];
  const drives=trip.drives??[];

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    }
    let cancelled = false;
    async function loadTrip() {
      const { data, error } = await supabase.from('trip_data').select('trip_id, payload, updated_at').order('updated_at', { ascending:false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (data?.payload) {
        const payload=normalizeTrip(data.payload as TripPayload);
        setTrip(payload);
        setTripId(data.trip_id);
        setExpandedDay(null);
        setSelectedDriveIndex(0);
        setDriveCardOrder((payload.drives??[]).map((_,index)=>index).slice(1));
        setImportNote(`Honeymoon synced · ${payload.itinerary.length} days`);
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
  const today = dateOnDevice();
  const exactDayIndex = itinerary.findIndex((day) => day.date === today);
  const currentTripDay = exactDayIndex >= 0 ? itinerary[exactDayIndex] : itinerary.find((day) => day.date > today) ?? lastDay;
  const currentDayIndex = Math.max(0,itinerary.indexOf(currentTripDay!));
  const tripPhase = firstDay && today < firstDay.date ? 'before' : lastDay && today > lastDay.date ? 'after' : 'during';
  const daysUntil = firstDay ? Math.max(0, Math.ceil((new Date(`${firstDay.date}T12:00:00Z`).valueOf() - new Date(`${today}T12:00:00Z`).valueOf()) / 86400000)) : 0;
  const previewStart = tripPhase === 'during' ? currentDayIndex : tripPhase === 'after' ? Math.max(0,itinerary.length-4) : 0;
  const previewDays = useMemo(() => itinerary.slice(previewStart,previewStart+4), [itinerary,previewStart]);
  const weatherDays = useMemo(() => [...itinerary.slice(previewStart),...itinerary.slice(0,previewStart)], [itinerary,previewStart]);
  const heroTitle = tripPhase === 'during' ? <>Today: <em>{currentTripDay?.base ?? 'Portugal'}.</em></> : tripPhase === 'after' ? <>Honeymoon archive.</> : <>Our Portugal.<br/><em>Honeymoon.</em></>;
  const heroLede = tripPhase === 'during' ? currentTripDay?.plan : `${itinerary.length} days across mainland Portugal and Madeira.`;
  const dateRange = firstDay && lastDay ? `${compactDate(firstDay.date)}–${compactDate(lastDay.date)}` : 'Honeymoon dates';
  const routeStops = Array.from(new Set(itinerary.map((day) => day.base).filter(Boolean))).slice(0, 5);
  const plural = (count:number, word:string) => count === 1 ? word : word + 's';
  const countdown = tripPhase === 'before'
    ? { value: daysUntil, unit: plural(daysUntil, 'day'), tail: daysUntil === 0 ? 'we leave today' : 'until we go' }
    : tripPhase === 'during'
      ? { value: currentDayIndex + 1, unit: 'of ' + itinerary.length, tail: 'days in Portugal' }
      : { value: itinerary.length, unit: plural(itinerary.length, 'day'), tail: 'we will keep' };
  const activeStopIndex = tripPhase === 'before' ? -1
    : tripPhase === 'after' ? routeStops.length - 1
    : Math.max(0, routeStops.indexOf(currentTripDay?.base ?? ''));
  const activeDriveIndex = selectedDriveIndex < drives.length ? selectedDriveIndex : 0;
  const selectedDrive = drives[activeDriveIndex];
  const portoStay=stayRangeFor(itinerary,'Porto');
  const portoBookingHref=stayBookingUrl('Porto',itinerary);
  async function runTranslate() {
    const text=translateText.trim();
    if(!text||translating) return;
    setTranslating(true);
    setTranslateNote('');
    const {data,error}=await supabase.functions.invoke<{translation?:string;error?:string}>('portugal-ai',{body:{mode:'translate',direction,question:text}});
    if(error||!data?.translation) setTranslateNote(await functionError(error,data??null,'That could not be translated right now.'));
    else setTranslation(data.translation);
    setTranslating(false);
  }

  function openView(next:View) {
    setView(next);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      pageRef.current?.scrollTo({top:0,behavior:'smooth'});
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  // Picking a route swaps it into the map and drops the one it replaced at the top of the deck.
  function selectDrive(index:number) {
    setDriveCardOrder((current)=>[activeDriveIndex,...current.filter((id)=>id!==index&&id!==activeDriveIndex)]);
    setSelectedDriveIndex(index);
    requestAnimationFrame(()=>mapPanelRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  async function persistTrip(nextTrip:TripPayload,note:string) {
    const normalized=normalizeTrip(nextTrip);
    const {data:userData}=await supabase.auth.getUser();
    const {error}=await supabase.from('trip_data').upsert({trip_id:tripId,payload:normalized,updated_by:userData.user?.id});
    if(error) throw new Error(error.message);
    setTrip(normalized);
    setImportNote(note);
  }

  function speak(text: string, lang = 'pt-PT') {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = .88;
    speechSynthesis.speak(utterance);
  }

  async function addComment(day:TripDay) {
    const text=(commentDrafts[day.date]??'').trim();
    if(!text) return;
    setSavingComment(day.date);
    try {
      const comment:PlanComment={
        id:commentId(day.date),
        date:day.date,
        author:displayName(userEmail),
        text,
        createdAt:new Date().toISOString(),
      };
      await persistTrip({...trip,comments:[...(trip.comments??[]),comment]},'Honeymoon synced · new note added');
      setCommentDrafts((current)=>({...current,[day.date]:''}));
    } catch(error) {
      setPlanSaveNote(error instanceof Error?error.message:'That note could not be shared.');
    } finally {
      setSavingComment(null);
    }
  }

  async function commitComment(comment:PlanComment) {
    setSavingComment(comment.id);
    try {
      const nextTrip:TripPayload={
        ...trip,
        itinerary:trip.itinerary.map((day)=>day.date===comment.date?{...day,plan:[day.plan,comment.text].filter(Boolean).join(' · ')}:day),
        comments:(trip.comments??[]).map((item)=>item.id===comment.id?{...item,committed:true}:item),
      };
      await persistTrip(nextTrip,'Honeymoon synced · idea committed to the day');
    } catch(error) {
      setPlanSaveNote(error instanceof Error?error.message:'That idea could not be committed.');
    } finally {
      setSavingComment(null);
    }
  }

  async function importWorkbook(file: File) {
    try {
      setImportNote(`Reading ${file.name}…`);
      const result = await parseWorkbook(await file.arrayBuffer());
      if (!result.ok) throw new Error(result.errors.join(' '));
      const payload: TripPayload = { ...result.payload, comments: trip.comments??[] };
      const { data:userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('trip_data').upsert({ trip_id:tripId, payload, updated_by:userData.user?.id });
      if (error) throw new Error(`The workbook was read, but Supabase could not save it: ${error.message}`);
      setTrip(payload);
      const { days, reservations:reservationCount, todos, drives:driveCount } = result.summary;
      setImportNote(`${file.name} synced · ${days} days · ${reservationCount} reservations · ${todos} to-dos · ${driveCount} drives`);
    } catch (error) {
      setImportNote(error instanceof Error ? error.message : 'That workbook could not be read.');
    } finally {
      if (fileRef.current) fileRef.current.value='';
    }
  }

  function renderBookingRow(item:BookingItem) {
    const action=bookingActionFor(item,itinerary,reservations);
    const bookingKey=item.priority+'-'+item.item;
    const detailsOpen=expandedBooking===bookingKey;
    const complete=item.status==='DONE';
    const reservation=reservationFor(item,reservations);
    return <article key={bookingKey} className={'todo-row'+(complete?' completed':'')}>
      <span className="priority">{String(item.priority).padStart(2,'0')}</span>
      <div className="todo-row-copy"><strong>{item.item}</strong><small>{item.choice||'Details not added yet'}</small>{item.notes&&<small className="todo-row-note">{item.notes}</small>}</div>
      <span className={'pill todo-status '+statusClass(item.status)}>{item.status}</span>
      {action.kind==='link'
        ? <a className="todo-row-action" href={action.href} target="_blank" rel="noreferrer">{action.label}<ExternalLink size={14}/></a>
        : action.kind==='transport'
          ? <button className="todo-row-action" type="button" onClick={()=>openView('transport')}>{action.label}<ChevronRight size={14}/></button>
          : <button className="todo-row-action" type="button" aria-expanded={detailsOpen} onClick={()=>setExpandedBooking(detailsOpen?null:bookingKey)}>{detailsOpen?'Close':action.label}<ChevronRight size={14}/></button>}
      {detailsOpen&&action.kind==='details'&&reservation&&<div className="booking-detail-placeholder">
        {reservationIcon(reservation)}
        <div className="reservation-detail-stack"><ReservationDetails record={reservation}/></div>
      </div>}
    </article>;
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
        <button className="wordmark" onClick={() => openView('today')} aria-label="Go to trip overview"><TripMark/><div><small>Our honeymoon</small><strong>Portugal</strong></div></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(({id,label}) => <button key={id} className={view===id?'active':''} onClick={() => openView(id)}>{label}</button>)}
        </nav>
        <button className="import-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Refresh from Excel</button>
        <button className="account-button" onClick={() => void onSignOut()} title={`Sign out ${userEmail}`}><span>{userEmail}</span><LogOut size={16}/></button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen?<X/>:<Menu/>}</button>
        <input ref={fileRef} hidden type="file" accept=".xlsx,.xlsm" onChange={(e) => e.target.files?.[0] && void importWorkbook(e.target.files[0])}/>
      </header>

      {menuOpen && <div className="mobile-menu"><button onClick={() => fileRef.current?.click()}><FileSpreadsheet size={18}/>Refresh from Excel</button><button onClick={() => void onSignOut()}><LogOut size={18}/>Sign out</button><p>{userEmail}<br/>{importNote}</p></div>}

      <div ref={pageRef} className="page-wrap">
        {loadingTrip && <section className="empty-trip"><div className="auth-loader"/><h2>Syncing our honeymoon…</h2></section>}
        {!loadingTrip && itinerary.length === 0 && <section className="empty-trip"><FileSpreadsheet size={34}/><p className="kicker">Honeymoon space ready</p><h1>Bring in the workbook.</h1><p>Your itinerary and booking details will be stored in Supabase and shared only with invited travelers.</p><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17}/> Import Excel workbook</button><small>{importNote}</small></section>}
        {!loadingTrip && itinerary.length > 0 && <>
        {view === 'today' && <>
          <section className="hero-grid">
            <div className="hero-copy">
              <p className="kicker"><Heart size={13} fill="currentColor"/> Our honeymoon</p>
              <h1>{heroTitle}</h1>
              <p className="hero-lede">{heroLede}</p>
              <div className="hero-actions"><button className="primary" onClick={() => openView('itinerary')}>See the full trip <CalendarDays size={17}/></button>{drives.length > 0 && <button className="secondary" onClick={() => openView('drives')}>Choose a drive <CarFront size={17}/></button>}</div>
            </div>
            <aside className="countdown-card">
              <p className="countdown-kicker">{tripPhase==='before'?'Counting down':tripPhase==='during'?'On the road':'The trip'}</p>
              <div className="countdown-figure">
                <strong>{countdown.value}</strong>
                <span>{countdown.unit}<em>{countdown.tail}</em></span>
              </div>
              <p className="countdown-where">{tripPhase==='during'&&currentTripDay?`${compactDate(currentTripDay.date)} · ${currentTripDay.base}`:tripPhase==='after'?dateRange:firstDay?`${compactDate(firstDay.date)} · ${firstDay.base}`:'Honeymoon itinerary'}</p>
              {routeStops.length>1&&<div className="route-line" style={{gridTemplateColumns:`repeat(${routeStops.length},minmax(0,1fr))`}}>
                {routeStops.map((stop,index)=><span key={stop} className={'route-node'+(index<=activeStopIndex?' reached':'')+(index===activeStopIndex?' current':'')}>
                  <i/>
                  <small>{stop}</small>
                </span>)}
              </div>}
            </aside>
          </section>
          <PortugalAi supabase={supabase} base={currentTripDay?.base??firstDay?.base??'Portugal'} tripPhase={tripPhase}/>
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
          <WeatherForecast days={weatherDays}/>
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
          {upcomingBookings.length ? <div className="todo-table">{upcomingBookings.map((item)=>renderBookingRow(item))}</div> : <div className="todo-empty"><ListChecks size={25}/><h2>Everything is booked.</h2></div>}
          {completedBookings>0 && <details className="todo-completed" open={showCompletedTodos} onToggle={(event)=>setShowCompletedTodos(event.currentTarget.open)}>
            <summary>Completed ({completedBookings})</summary>
            <div className="todo-table">{bookings.filter((item)=>item.status==='DONE').map((item)=>renderBookingRow(item))}</div>
          </details>}
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
            const comments=(trip.comments??[]).filter((comment)=>comment.date===day.date);
            const planOpen=planningOpen[day.date]??false;
            const dayReservations=(day.reservationIds??[]).map((id)=>reservations.find((record)=>record.id===id)).filter((record):record is ReservationRecord=>!!record);
            return <article key={day.date} className={`day-row ${open?'open':''}`}>
              <button onClick={()=>setExpandedDay(open?null:day.date)} aria-expanded={open}>
                <div className="day-number"><span>Day {String(index+1).padStart(2,'0')}</span><strong>{fmtDate(day.date)}</strong></div>
                <div className="day-main"><div className="day-place"><MapPin size={15}/><span>{newPlace?'Arrive in':'Based in'} {day.base}</span></div><h2>{day.plan}</h2><p>{day.sleep ? `Overnight: ${day.sleep}` : day.base}{day.cost ? ` · ${day.cost}` : ''}</p></div>
                <span className={`pill ${statusClass(day.status)}`}>{day.status}</span>
              </button>
              {open&&<div className="day-details">
                <div className="day-detail-card day-plan-card"><Compass size={19}/><span><b>The shape of the day</b>{day.plan}</span></div>
                <div className="day-detail-card home-base-card"><BedDouble size={18}/><span><b>Home base · lodging</b><a href={mapsSearchUrl(day.sleep||day.base)}>{day.sleep||day.base}<MapPin size={13}/></a></span></div>
                <div className="day-detail-card"><NotebookText size={18}/><span><b>Worth remembering</b>{day.note||'No extra planning note for this day.'}</span></div>
                <div className="travel-note"><CarFront size={16}/><span><b>Travel note</b>{day.transport||'No transportation note yet.'}</span></div>
                {dayReservations.length>0&&<div className="day-reservations">{dayReservations.map((record)=>{
                  const reservationOpen=expandedReservation===record.id;
                  return <div key={record.id} className="day-reservation">
                    <button type="button" className="day-reservation-toggle" aria-expanded={reservationOpen} onClick={()=>setExpandedReservation(reservationOpen?null:record.id)}>
                      {reservationIcon(record)}<span>{record.kind==='car'?'Rental car':record.title}</span><ChevronRight size={14}/>
                    </button>
                    {reservationOpen&&<ReservationDetails record={record}/>}
                  </div>;
                })}</div>}
                <div className="day-detail-actions">
                  <button type="button" className="plan-together-trigger" aria-expanded={planOpen} onClick={()=>setPlanningOpen((current)=>({...current,[day.date]:!planOpen}))}><MessageCircle size={15}/>{comments.length||''}</button>
                </div>
                {planOpen&&<div className="plan-together-popover" role="dialog" aria-label="Plan together">
                  <div className="plan-together-head"><h3>Patrik + Megan</h3><button type="button" className="plan-together-close" aria-label="Close" onClick={()=>setPlanningOpen((current)=>({...current,[day.date]:false}))}><X size={14}/></button></div>
                  <div className="plan-comments">{comments.length?comments.map((comment)=><article key={comment.id}><div><b>{comment.author}</b><small>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(comment.createdAt))}</small></div><p>{comment.text}</p>{comment.committed?<span className="committed"><Check size={13}/>In the day plan</span>:<button type="button" disabled={savingComment===comment.id} onClick={()=>void commitComment(comment)}><Check size={13}/>Commit to day</button>}</article>):<p className="plan-empty">No notes yet. Drop the first idea here.</p>}</div>
                  <form onSubmit={(event)=>{event.preventDefault();void addComment(day)}}><textarea value={commentDrafts[day.date]??''} onChange={(event)=>setCommentDrafts((current)=>({...current,[day.date]:event.target.value}))} placeholder="What do you think?"/><button type="submit" disabled={savingComment===day.date||!(commentDrafts[day.date]??'').trim()}><Send size={16}/>{savingComment===day.date?'Sharing…':'Share'}</button></form>
                  {planSaveNote&&<p className="day-save-note" role="status">{planSaveNote}</p>}
                </div>}
              </div>}
            </article>})}</div>
        </section>}

        {view === 'drives' && <section className="content-page drives-page">
          <div className="page-title"><p className="kicker">{drives.length} Madeira routes</p><h1>Driving routes.</h1></div>
          <div className="drives-layout">
            {selectedDrive &&
            <div ref={mapPanelRef} className="map-panel">
              <RouteMap key={activeDriveIndex} drive={selectedDrive}/>
              <div className="route-detail">
                <div><p className="kicker">{String(selectedDrive.order).padStart(2,'0')} · {selectedDrive.distance} · {selectedDrive.duration}</p><h2>{selectedDrive.name}</h2></div>
                <div className="route-actions">
                  <a href={`https://www.google.com/maps/dir/${selectedDrive.coords.map(([a,b])=>`${a},${b}`).join('/')}`} target="_blank" rel="noreferrer">Directions <ExternalLink size={15}/></a>
                  <a href={mapsSearchUrl('restaurants near '+selectedDrive.stops.join(', '))} target="_blank" rel="noreferrer">Restaurants <Utensils size={15}/></a>
                </div>
                <details className="route-section" open><summary>The drive</summary><p>{selectedDrive.summary}</p><p><b>Best conditions</b>{selectedDrive.bestConditions}</p></details>
                <details className="route-section"><summary>Stops</summary><div className="stop-line">{selectedDrive.stops.map((stop,i)=><span key={`${stop}-${i}`}><i style={{borderColor:selectedDrive.color}}/>{stop}</span>)}</div></details>
              </div>
            </div>}
            {driveCardOrder.length>0&&<div className="drive-deck">
              <p className="kicker">Other routes</p>
              <div className="drive-cards">{driveCardOrder.map((index)=>{
                const drive=drives[index];
                if(!drive) return null;
                return <button key={drive.id+'-card-'+index} type="button" className="drive-card" onClick={()=>selectDrive(index)}>
                  <span className="drive-card-bar" style={{background:drive.color}}/>
                  <span className="drive-card-copy">
                    <small>{String(drive.order).padStart(2,'0')} · {drive.distance} · {drive.duration}</small>
                    <strong>{drive.name}</strong>
                    <span>{drive.stops.slice(0,3).join(' · ')}</span>
                  </span>
                  <ChevronRight size={18}/>
                </button>;
              })}</div>
            </div>}
          </div>
        </section>}

        {view === 'translate' && <section className="content-page translate-page">
          <div className="page-title"><p className="kicker">English ↔ European Portuguese</p><h1>Quick translation.</h1><p>Translate anything below, or use the offline phrases further down.</p></div>
          <div className="translator-card">
            <div className="language-switch"><button className={direction==='en-pt'?'active':''} onClick={()=>{setDirection('en-pt');setTranslation('')}}>English → Portuguese</button><button className={direction==='pt-en'?'active':''} onClick={()=>{setDirection('pt-en');setTranslation('')}}>Portuguese → English</button></div>
            <textarea value={translateText} maxLength={800} onChange={e=>{setTranslateText(e.target.value);setTranslation('')}} placeholder={direction==='en-pt'?'Type what you want to say…':'Escreva o que ouviu…'} aria-label="Text to translate"/>
            <div className="translator-actions"><span>{translateText.length}/800</span><button type="button" disabled={!translateText.trim()||translating} onClick={()=>void runTranslate()}>{translating?'Translating…':'Translate'} <Languages size={16}/></button></div>
            {translation&&<div className="translation-result">
              <small>{direction==='en-pt'?'European Portuguese':'English'}</small>
              <p>{translation}</p>
              <div>
                <button type="button" onClick={()=>speak(translation,direction==='en-pt'?'pt-PT':'en-US')}><Volume2 size={16}/>Speak</button>
                <button type="button" onClick={()=>void navigator.clipboard.writeText(translation)}><Copy size={16}/>Copy</button>
              </div>
            </div>}
            {translateNote&&<p className="translator-note error" role="status">{translateNote}</p>}
            <p className="translator-note">European Portuguese, not Brazilian. Nothing you type is stored.</p>
          </div>
          <div className="phrase-head"><div><p className="kicker">Offline phrasebook</p><h2>Small phrases, big help.</h2></div><span>Portugal pronunciation</span></div>
          <div className="phrase-grid">{phrases.map(phrase=><article key={phrase.en}><small>{phrase.group}</small><p>{phrase.en}</p><strong>{phrase.pt}</strong><div><button onClick={()=>speak(phrase.pt)} aria-label={`Speak ${phrase.pt}`}><Volume2 size={16}/>Speak</button><button onClick={()=>void navigator.clipboard.writeText(phrase.pt)} aria-label={`Copy ${phrase.pt}`}><Copy size={16}/>Copy</button></div></article>)}</div>
        </section>}
        </>}
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-inner" style={{gridTemplateColumns:'repeat('+nav.length+',minmax(0,1fr))'}}>
          {nav.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>openView(id)}><Icon size={19}/>{label}</button>)}
        </div>
      </nav>
    </main>
  );
}
