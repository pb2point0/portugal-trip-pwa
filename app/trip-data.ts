export type Status = 'DONE' | 'BOOK';

export type TripDay = { date:string; sleep:string; base:string; plan:string; transport:string; cost:string; status:Status; note:string };
export type BookingItem = { priority:number; item:string; choice:string; amount:number; status:string; action?:string; href?:string; reservationId?:string };
export type TripBudget = { cap:number; actual:number; valuePlan:number };
export type Drive = { id:string; name:string; vibe:string; duration:string; distance:string; priority:string; stops:string[]; note:string; weather:string; color:string; coords:[number,number][]; stopNotes?:string[] };
export type ReservationRecord = {
  id:string;
  kind:'lodging'|'car'|'flight'|'activity'|'transport';
  title:string;
  location:string;
  startDate:string;
  endDate?:string;
  status:'CONFIRMED'|'PLANNING';
  provider?:string;
  confirmation?:string;
  pin?:string;
  address?:string;
  details?:string[];
  href?:string;
  sourceFile?:string;
};
export type BookingUpdate = { matchAny:string[]; status?:string; choice?:string; action?:string; href?:string; reservationId?:string };
export type PrivateTripBundle = { version:1; reservations:ReservationRecord[]; bookingUpdates?:BookingUpdate[] };
export type PlanComment = { id:string; date:string; author:string; text:string; createdAt:string; committed?:boolean };
export type TripPayload = { itinerary:TripDay[]; bookings:BookingItem[]; budget:TripBudget; drives:Drive[]; reservations?:ReservationRecord[]; comments?:PlanComment[] };

export const defaultDrives: Drive[] = [
  {id:'northwest',name:'Northwest classic',vibe:'Waterfalls, black sand & ancient forest',duration:'Full day',distance:'~120 km',priority:'Essential',stops:['Ponta do Sol','São Vicente','Seixal','Porto Moniz','Fanal','Ponta do Sol'],note:'Long scenic loop. Use lower gears downhill and skip a stop rather than race daylight.',weather:'Best when Fanal has low cloud; check north-coast webcams.',color:'#0b6b72',coords:[[32.679,-17.105],[32.803,-17.044],[32.811,-17.114],[32.867,-17.167],[32.811,-17.143],[32.679,-17.105]]},
  {id:'southwest',name:'Southwest slow coast',vibe:'Beach, fishing villages & sunset',duration:'Half / full day',distance:'~58 km',priority:'Slow day',stops:['Ponta do Sol','Calheta','Jardim do Mar','Paul do Mar','Ponta do Pargo'],note:'A relaxed coastal route with time for a long meal.',weather:'A good fallback when the mountains are cloudy.',color:'#d09a54',coords:[[32.679,-17.105],[32.721,-17.178],[32.737,-17.213],[32.753,-17.227],[32.813,-17.249]]},
  {id:'east',name:'Wild east coast',vibe:'Volcanic cliffs, bays & big horizons',duration:'Full day',distance:'~105 km',priority:'Scenic',stops:['Funchal','Machico','Ponta do Rosto','Ponta de São Lourenço','Portela','Porto da Cruz'],note:'Pair the peninsula with Machico Bay and the green north-east coast.',weather:'Choose a lower-wind day; PR8 requires an official reservation.',color:'#347f9d',coords:[[32.65,-16.909],[32.716,-16.766],[32.744,-16.703],[32.744,-16.676],[32.747,-16.826],[32.773,-16.829]]},
  {id:'nuns-valley',name:'Nun’s Valley heights',vibe:'Mountain overlooks & chestnut village',duration:'Half day',distance:'~48 km',priority:'Half day',stops:['Funchal','Eira do Serrado','Curral das Freiras','Câmara de Lobos'],note:'A compact highlands route with one major overlook and a village stop.',weather:'Best with clear mountain visibility.',color:'#506d4b',coords:[[32.65,-16.909],[32.711,-16.964],[32.72,-16.969],[32.648,-16.975]]},
  {id:'laurel',name:'Laurel forest & Santana',vibe:'Levada greens, thatched roofs & north coast',duration:'Full day',distance:'~110 km',priority:'Forest',stops:['Funchal','Ribeiro Frio','Balcões','Santana','Empenas','Porto da Cruz'],note:'The drive works well with or without the PR11 walk.',weather:'Good for a bright north-coast forecast; avoid rushing mountain roads.',color:'#2e6555',coords:[[32.65,-16.909],[32.737,-16.887],[32.742,-16.886],[32.805,-16.881],[32.784,-16.914],[32.773,-16.829]]},
  {id:'funchal-west',name:'Funchal & Cabo Girão',vibe:'City, fishing harbor & glass skywalk',duration:'2–5 hours',distance:'~32 km',priority:'Easy',stops:['Funchal','Câmara de Lobos','Cabo Girão','Funchal'],note:'The easiest drive option, useful after a long hike or on a lower-energy day.',weather:'Works in mixed weather; use a city garage in Funchal.',color:'#78939b',coords:[[32.65,-16.909],[32.648,-16.975],[32.657,-17.004],[32.65,-16.909]]},
  {id:'departure',name:'Easy airport morning',vibe:'Coffee, sea air & simple return',duration:'2–3 hours',distance:'~44 km',priority:'Departure',stops:['Ponta do Sol','Santa Cruz','Machico','FNC Airport'],note:'Stay close to the airport, refuel early, and leave time for the rental return.',weather:'The safe choice in most conditions.',color:'#7aa7b6',coords:[[32.679,-17.105],[32.688,-16.792],[32.716,-16.766],[32.698,-16.774]]},
];

export const emptyTrip: TripPayload = {
  itinerary: [],
  bookings: [],
  budget: { cap: 0, actual: 0, valuePlan: 0 },
  drives: [],
  reservations: [],
  comments: [],
};
