import { nanoid } from 'nanoid';
import { getDb } from './schema';

export type MeetingType = 'face' | 'online' | 'either';
export type MeetingFormat = 'face' | 'online';

export interface Slot {
  id: string;
  event_id: string;
  datetime: string;
  meeting_type: MeetingType;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  host_name: string;
  created_at: string;
  slots: Slot[];
}

export interface Response {
  id: string;
  event_id: string;
  customer_name: string;
  customer_email: string | null;
  response_type: 'selected' | 'proposed';
  selected_slot_id: string | null;
  selected_datetime: string | null;
  selected_meeting_type: MeetingType | null;
  meeting_format: MeetingFormat | null;
  meeting_url: string | null;
  proposed_dates: string[];
  created_at: string;
}

export function createEvent(
  title: string,
  description: string | null,
  host_name: string,
  slots: { datetime: string; meeting_type: MeetingType }[]
): Event {
  const db = getDb();
  const eventId = nanoid();

  const insertEvent = db.prepare(
    'INSERT INTO events (id, title, description, host_name) VALUES (?, ?, ?, ?)'
  );
  const insertSlot = db.prepare(
    'INSERT INTO slots (id, event_id, datetime, meeting_type) VALUES (?, ?, ?, ?)'
  );

  const createdSlots: Slot[] = slots.map((s) => ({
    id: nanoid(),
    event_id: eventId,
    datetime: s.datetime,
    meeting_type: s.meeting_type,
  }));

  db.transaction(() => {
    insertEvent.run(eventId, title, description, host_name);
    for (const slot of createdSlots) {
      insertSlot.run(slot.id, slot.event_id, slot.datetime, slot.meeting_type);
    }
  })();

  return {
    id: eventId,
    title,
    description,
    host_name,
    created_at: new Date().toISOString(),
    slots: createdSlots,
  };
}

export function getEvent(id: string): Event | null {
  const db = getDb();

  const event = db
    .prepare('SELECT id, title, description, host_name, created_at FROM events WHERE id = ?')
    .get(id) as Omit<Event, 'slots'> | undefined;

  if (!event) return null;

  const slots = db
    .prepare(
      'SELECT id, event_id, datetime, meeting_type FROM slots WHERE event_id = ? ORDER BY datetime'
    )
    .all(id) as Slot[];

  return { ...event, slots };
}

export function createResponse(
  eventId: string,
  customerName: string,
  customerEmail: string | null,
  responseType: 'selected' | 'proposed',
  selectedSlotId: string | null,
  meetingFormat: MeetingFormat | null,
  meetingUrl: string | null,
  proposedDatetimes: string[]
): void {
  const db = getDb();
  const responseId = nanoid();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO responses
         (id, event_id, customer_name, customer_email, response_type, selected_slot_id, meeting_format, meeting_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(responseId, eventId, customerName, customerEmail, responseType, selectedSlotId, meetingFormat, meetingUrl);

    if (responseType === 'proposed') {
      const insertDate = db.prepare(
        'INSERT INTO proposed_dates (id, response_id, datetime) VALUES (?, ?, ?)'
      );
      for (const dt of proposedDatetimes) {
        insertDate.run(nanoid(), responseId, dt);
      }
    }
  })();
}

export function getResponses(eventId: string): Response[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT r.id, r.event_id, r.customer_name, r.customer_email,
              r.response_type, r.selected_slot_id, r.meeting_format, r.meeting_url, r.created_at,
              s.datetime AS selected_datetime,
              s.meeting_type AS selected_meeting_type
       FROM responses r
       LEFT JOIN slots s ON s.id = r.selected_slot_id
       WHERE r.event_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(eventId) as (Omit<Response, 'proposed_dates'>)[];

  return rows.map((row) => {
    const proposed =
      row.response_type === 'proposed'
        ? (
            db
              .prepare(
                'SELECT datetime FROM proposed_dates WHERE response_id = ? ORDER BY datetime'
              )
              .all(row.id) as { datetime: string }[]
          ).map((d) => d.datetime)
        : [];

    return { ...row, proposed_dates: proposed };
  });
}
