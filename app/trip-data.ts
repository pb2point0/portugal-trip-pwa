export type Status = 'DONE' | 'BOOK NOW' | 'BOOK' | 'PLAN' | 'CHECKOUT';

export type TripDay = { date:string; sleep:string; base:string; plan:string; transport:string; cost:string; status:Status; note:string };
export type BookingItem = { priority:number; item:string; choice:string; amount:number; status:string; action?:string; href?:string };
export type TripBudget = { cap:number; actual:number; valuePlan:number };
export type Drive = { id:string; name:string; vibe:string; duration:string; distance:string; priority:string; stops:string[]; note:string; weather:string; color:string; coords:[number,number][]; stopNotes?:string[] };
export type TripPayload = { itinerary:TripDay[]; bookings:BookingItem[]; budget:TripBudget; drives:Drive[] };

export const emptyTrip: TripPayload = {
  itinerary: [],
  bookings: [],
  budget: { cap: 0, actual: 0, valuePlan: 0 },
  drives: [],
};
