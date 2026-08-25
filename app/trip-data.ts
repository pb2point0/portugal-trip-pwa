export type Status = 'DONE' | 'BOOK';

export type TripDay = { date:string; sleep:string; base:string; plan:string; transport:string; cost:string; status:Status; note:string; reservationIds?:string[] };
export type BookingItem = { priority:number; item:string; choice:string; amount:number; status:string; action?:string; href?:string; reservationId?:string; notes?:string };
export type TripBudget = { cap:number; actual:number; valuePlan:number };
export type Drive = { id:string; order:number; name:string; duration:string; distance:string; stops:string[]; summary:string; bestConditions:string; color:string; coords:[number,number][] };
export type ReservationRecord = {
  id:string;
  kind:'lodging'|'car'|'flight'|'activity'|'transport';
  title:string;
  location:string;
  startDate:string;
  startTime?:string;
  endDate?:string;
  endTime?:string;
  status:Status;
  provider?:string;
  confirmation?:string;
  pin?:string;
  address?:string;
  actionLabel?:string;
  actionUrl?:string;
  details?:string[];
  bookedUnder?:string;
  costUsd?:number;
  source?:string;
  href?:string;
};
export type PlanComment = { id:string; date:string; author:string; text:string; createdAt:string; committed?:boolean };
export type TripPayload = { itinerary:TripDay[]; bookings:BookingItem[]; budget:TripBudget; drives:Drive[]; reservations?:ReservationRecord[]; comments?:PlanComment[] };

export const driveGeometry: Record<string, {color:string; coords:[number,number][]}> = {
  northwest:{color:'#0b6b72',coords:[[32.679,-17.105],[32.803,-17.044],[32.811,-17.114],[32.867,-17.167],[32.811,-17.143],[32.679,-17.105]]},
  southwest:{color:'#d09a54',coords:[[32.679,-17.105],[32.721,-17.178],[32.737,-17.213],[32.753,-17.227],[32.813,-17.249]]},
  east:{color:'#347f9d',coords:[[32.65,-16.909],[32.716,-16.766],[32.744,-16.703],[32.744,-16.676],[32.747,-16.826],[32.773,-16.829]]},
  'nuns-valley':{color:'#506d4b',coords:[[32.65,-16.909],[32.711,-16.964],[32.72,-16.969],[32.648,-16.975]]},
  laurel:{color:'#2e6555',coords:[[32.65,-16.909],[32.737,-16.887],[32.742,-16.886],[32.805,-16.881],[32.784,-16.914],[32.773,-16.829]]},
  'funchal-west':{color:'#78939b',coords:[[32.65,-16.909],[32.648,-16.975],[32.657,-17.004],[32.65,-16.909]]},
  departure:{color:'#7aa7b6',coords:[[32.679,-17.105],[32.688,-16.792],[32.716,-16.766],[32.698,-16.774]]},
};

export const emptyTrip: TripPayload = {
  itinerary: [],
  bookings: [],
  budget: { cap: 0, actual: 0, valuePlan: 0 },
  drives: [],
  reservations: [],
  comments: [],
};
