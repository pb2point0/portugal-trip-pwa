import type * as XLSXType from 'xlsx';
import { driveGeometry, type BookingItem, type Drive, type ReservationRecord, type Status, type TripBudget, type TripDay, type TripPayload } from './trip-data';

type Row = unknown[];

export type ImportSummary = { days:number; reservations:number; todos:number; drives:number };
export type ImportResult =
  | { ok:true; payload:Pick<TripPayload,'itinerary'|'bookings'|'budget'|'drives'|'reservations'>; summary:ImportSummary }
  | { ok:false; errors:string[] };

const normalizeStatus = (status:unknown):Status => String(status ?? '').trim().toUpperCase() === 'DONE' ? 'DONE' : 'BOOK';
const pad = (value:number) => String(value).padStart(2, '0');
const cell = (row:Row|undefined, index:number) => (row?.[index] ?? '') as unknown;
const text = (row:Row|undefined, index:number) => String(cell(row, index) ?? '').trim();
const optionalText = (row:Row|undefined, index:number) => { const value = text(row, index); return value ? value : undefined; };

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/[$,]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function findSheet(workbook: XLSXType.WorkBook, needle: string): string | undefined {
  return workbook.SheetNames.find((name) => name.includes(needle));
}

function headerMap(XLSX: typeof XLSXType, workbook: XLSXType.WorkBook, sheetName: string): { rows: Row[]; formatted: Row[]; columns: Record<string, number>; headerIndex: number } {
  const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], { header: 1, raw: true });
  const formatted = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.filter((value) => typeof value === 'string' && value.trim().length > 0).length >= 2);
  const columns: Record<string, number> = {};
  (rows[headerIndex] ?? []).forEach((value, index) => {
    const key = String(value ?? '').trim().toLowerCase();
    if (key) columns[key] = index;
  });
  return { rows, formatted, columns, headerIndex };
}

function dateFromSerial(XLSX: typeof XLSXType, serial: unknown): string | undefined {
  const value = typeof serial === 'number' ? serial : Number(serial);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const parsed = XLSX.SSF.parse_date_code(Math.floor(value));
  if (!parsed) return undefined;
  return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
}

export async function parseWorkbook(buffer: ArrayBuffer): Promise<ImportResult> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const errors: string[] = [];

  // --- Itinerary ---
  const itinerarySheet = findSheet(workbook, 'Final Itinerary');
  if (!itinerarySheet) return { ok: false, errors: ['The "Final Itinerary" sheet was not found.'] };
  const itineraryTable = headerMap(XLSX, workbook, itinerarySheet);
  const dateCol = itineraryTable.columns['date'];
  const planCol = itineraryTable.columns['plan'];
  if (dateCol === undefined || planCol === undefined) return { ok: false, errors: ['The itinerary header (Date/Plan columns) could not be found.'] };
  const sleepCol = itineraryTable.columns['sleep'];
  const baseCol = itineraryTable.columns['base'];
  const transportCol = itineraryTable.columns['transport'];
  const costCol = itineraryTable.columns['cost'];
  const statusCol = itineraryTable.columns['status'];
  const noteCol = itineraryTable.columns['note'];
  const reservationIdsCol = itineraryTable.columns['reservation ids'];

  const itinerary: TripDay[] = [];
  for (let i = itineraryTable.headerIndex + 1; i < itineraryTable.rows.length; i++) {
    const raw = itineraryTable.rows[i];
    const formatted = itineraryTable.formatted[i];
    if (!raw || cell(raw, dateCol) === '') continue;
    const date = dateFromSerial(XLSX, cell(raw, dateCol));
    if (!date) { errors.push(`Itinerary row ${i + 1}: could not read a valid date.`); continue; }
    const reservationIds = reservationIdsCol === undefined ? [] : text(formatted, reservationIdsCol).split(',').map((id) => id.trim()).filter(Boolean);
    itinerary.push({
      date,
      sleep: sleepCol === undefined ? '' : text(formatted, sleepCol),
      base: baseCol === undefined ? '' : text(formatted, baseCol),
      plan: text(formatted, planCol),
      transport: transportCol === undefined ? '' : text(formatted, transportCol),
      cost: costCol === undefined ? '' : text(formatted, costCol),
      status: normalizeStatus(cell(formatted, statusCol)),
      note: noteCol === undefined ? '' : text(formatted, noteCol),
      reservationIds: reservationIds.length ? reservationIds : undefined,
    });
  }
  if (!itinerary.length) errors.push('No itinerary days were found.');
  {
    const seen = new Set<string>();
    for (const day of itinerary) {
      if (seen.has(day.date)) errors.push(`Duplicate itinerary date '${day.date}' in ${itinerarySheet}.`);
      seen.add(day.date);
    }
  }

  // --- Budget ---
  const budgetSheetName = findSheet(workbook, 'Budget');
  const budgetRows = budgetSheetName ? XLSX.utils.sheet_to_json<Row>(workbook.Sheets[budgetSheetName], { header: 1, raw: true }) : [];
  const travelersRow = budgetRows.find((row) => text(row, 0).toLowerCase() === 'travelers');
  const totalRow = budgetRows.find((row) => text(row, 0).toUpperCase() === 'TOTAL USD');
  const rawActual = totalRow?.[10];
  const budget: TripBudget = {
    cap: numberFrom(travelersRow?.[5]) || numberFrom(totalRow?.[5]),
    actual: rawActual !== undefined && rawActual !== '' ? numberFrom(rawActual) : numberFrom(totalRow?.[9]),
    valuePlan: numberFrom(totalRow?.[8]) || numberFrom(totalRow?.[7]),
  };

  // --- Reservations ---
  const reservationSheetName = findSheet(workbook, 'App Reservations');
  const reservations: ReservationRecord[] = [];
  if (reservationSheetName) {
    const table = headerMap(XLSX, workbook, reservationSheetName);
    const c = table.columns;
    const idCol = c['id'];
    if (idCol === undefined) errors.push(`'${reservationSheetName}': no ID column found.`);
    else {
      const seen = new Set<string>();
      for (let i = table.headerIndex + 1; i < table.rows.length; i++) {
        const raw = table.rows[i];
        const formatted = table.formatted[i];
        if (!raw || text(formatted, idCol) === '') continue;
        const id = text(formatted, idCol);
        if (seen.has(id)) { errors.push(`Duplicate reservation ID '${id}' in ${reservationSheetName}.`); continue; }
        seen.add(id);
        const startDate = c['start date'] !== undefined ? dateFromSerial(XLSX, cell(raw, c['start date'])) : undefined;
        if (!startDate) { errors.push(`Reservation '${id}': missing or invalid Start Date.`); continue; }
        const endDate = c['end date'] !== undefined ? dateFromSerial(XLSX, cell(raw, c['end date'])) : undefined;
        const detailsText = c['details'] !== undefined ? text(formatted, c['details']) : '';
        const kindRaw = (c['type'] !== undefined ? text(formatted, c['type']) : '').toLowerCase();
        const kind: ReservationRecord['kind'] = (['lodging', 'car', 'flight', 'activity', 'transport'] as const).includes(kindRaw as never) ? (kindRaw as ReservationRecord['kind']) : 'activity';
        reservations.push({
          id,
          kind,
          title: c['title'] !== undefined ? text(formatted, c['title']) : '',
          location: c['location'] !== undefined ? text(formatted, c['location']) : '',
          startDate,
          startTime: c['start time'] !== undefined ? optionalText(formatted, c['start time']) : undefined,
          endDate,
          endTime: c['end time'] !== undefined ? optionalText(formatted, c['end time']) : undefined,
          status: normalizeStatus(c['status'] !== undefined ? cell(formatted, c['status']) : undefined),
          provider: c['provider'] !== undefined ? optionalText(formatted, c['provider']) : undefined,
          confirmation: c['confirmation'] !== undefined ? optionalText(formatted, c['confirmation']) : undefined,
          pin: c['pin'] !== undefined ? optionalText(formatted, c['pin']) : undefined,
          address: c['exact address'] !== undefined ? optionalText(formatted, c['exact address']) : undefined,
          actionLabel: c['action label'] !== undefined ? optionalText(formatted, c['action label']) : undefined,
          actionUrl: c['action url'] !== undefined ? optionalText(formatted, c['action url']) : undefined,
          details: detailsText ? detailsText.split('|').map((part) => part.trim()).filter(Boolean) : undefined,
          bookedUnder: c['booked under'] !== undefined ? optionalText(formatted, c['booked under']) : undefined,
          costUsd: c['cost usd'] !== undefined && text(formatted, c['cost usd']) ? numberFrom(cell(formatted, c['cost usd'])) : undefined,
          source: c['source'] !== undefined ? optionalText(formatted, c['source']) : undefined,
          href: c['action url'] !== undefined ? optionalText(formatted, c['action url']) : undefined,
        });
      }
    }
  }

  // --- To-do ---
  const todoSheetName = findSheet(workbook, 'App To-do');
  const bookings: BookingItem[] = [];
  if (todoSheetName) {
    const table = headerMap(XLSX, workbook, todoSheetName);
    const c = table.columns;
    const itemCol = c['item'];
    if (itemCol === undefined) errors.push(`'${todoSheetName}': no Item column found.`);
    else {
      for (let i = table.headerIndex + 1; i < table.rows.length; i++) {
        const raw = table.rows[i];
        const formatted = table.formatted[i];
        if (!raw || text(formatted, itemCol) === '') continue;
        bookings.push({
          priority: c['priority'] !== undefined ? numberFrom(cell(raw, c['priority'])) || bookings.length + 1 : bookings.length + 1,
          item: text(formatted, itemCol),
          choice: c['choice'] !== undefined ? text(formatted, c['choice']) : '',
          href: c['source url'] !== undefined ? optionalText(formatted, c['source url']) : undefined,
          amount: c['amount'] !== undefined ? numberFrom(cell(formatted, c['amount'])) : 0,
          notes: c['notes'] !== undefined ? optionalText(formatted, c['notes']) : undefined,
          status: normalizeStatus(c['status'] !== undefined ? cell(formatted, c['status']) : undefined),
          reservationId: c['reservation id'] !== undefined ? optionalText(formatted, c['reservation id']) : undefined,
        });
      }
    }
  }

  // --- Drives ---
  const driveSheetName = findSheet(workbook, 'App Drives');
  const drives: Drive[] = [];
  if (driveSheetName) {
    const table = headerMap(XLSX, workbook, driveSheetName);
    const c = table.columns;
    const idCol = c['id'];
    if (idCol === undefined) errors.push(`'${driveSheetName}': no ID column found.`);
    else {
      const seen = new Set<string>();
      for (let i = table.headerIndex + 1; i < table.rows.length; i++) {
        const raw = table.rows[i];
        const formatted = table.formatted[i];
        if (!raw || text(formatted, idCol) === '') continue;
        const id = text(formatted, idCol);
        if (seen.has(id)) { errors.push(`Duplicate drive ID '${id}' in ${driveSheetName}.`); continue; }
        seen.add(id);
        const geometry = driveGeometry[id];
        if (!geometry) errors.push(`Drive '${id}': no known map geometry — added with an empty route.`);
        const stopsText = c['stops'] !== undefined ? text(formatted, c['stops']) : '';
        drives.push({
          id,
          order: c['order'] !== undefined ? numberFrom(cell(raw, c['order'])) || drives.length + 1 : drives.length + 1,
          name: c['name'] !== undefined ? text(formatted, c['name']) : id,
          duration: c['duration'] !== undefined ? text(formatted, c['duration']) : '',
          distance: c['distance'] !== undefined ? text(formatted, c['distance']) : '',
          stops: stopsText ? stopsText.split('|').map((s) => s.trim()).filter(Boolean) : [],
          summary: c['summary'] !== undefined ? text(formatted, c['summary']) : '',
          bestConditions: c['best conditions'] !== undefined ? text(formatted, c['best conditions']) : '',
          color: geometry?.color ?? '#7aa7b6',
          coords: geometry?.coords ?? [],
        });
      }
    }
    drives.sort((a, b) => a.order - b.order);
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    payload: { itinerary, bookings, budget, drives, reservations },
    summary: { days: itinerary.length, reservations: reservations.length, todos: bookings.length, drives: drives.length },
  };
}
