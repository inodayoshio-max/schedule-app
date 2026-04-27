export type MeetingType = 'face' | 'online' | 'either';
export type MeetingFormat = 'face' | 'online';

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  face: '対面MTG',
  online: 'オンラインMTG',
  either: 'どちらでも可',
};

export const MEETING_FORMAT_LABEL: Record<MeetingFormat, string> = {
  face: '対面MTG',
  online: 'オンラインMTG',
};

export interface SlotInput {
  datetime: string;
  meeting_type: MeetingType;
}

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

export interface CustomerResponse {
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

export interface EventResponses {
  event: Event;
  responses: CustomerResponse[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function createEvent(data: {
  title: string;
  description?: string;
  host_name: string;
  slots: SlotInput[];
}): Promise<Event> {
  return request<Event>('/api/events', { method: 'POST', body: JSON.stringify(data) });
}

export function getEvent(id: string): Promise<Event> {
  return request<Event>(`/api/events/${id}`);
}

export function getEventResponses(id: string): Promise<EventResponses> {
  return request<EventResponses>(`/api/events/${id}/responses`);
}

export function submitResponse(data: {
  eventId: string;
  customerName: string;
  customerEmail?: string;
  responseType: 'selected' | 'proposed';
  selectedSlotId?: string;
  meetingFormat?: MeetingFormat;
  meetingUrl?: string;
  proposedDatetimes?: string[];
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/answers', { method: 'POST', body: JSON.stringify(data) });
}

/** オンラインMTG用のJitsi Meetルーム URLを生成 */
export function generateMeetingUrl(): string {
  const id = Math.random().toString(36).slice(2, 10);
  return `https://meet.jit.si/schedule-${id}`;
}
