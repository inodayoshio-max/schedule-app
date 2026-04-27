import { Router, Request, Response } from 'express';
import { createEvent, getEvent, getResponses } from '../db/queries';
import type { MeetingType } from '../db/queries';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { title, description, host_name, slots } = req.body as {
    title?: string;
    description?: string;
    host_name?: string;
    slots?: { datetime: string; meeting_type: MeetingType }[];
  };

  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  if (!host_name?.trim()) return res.status(400).json({ error: 'host_name is required' });
  if (!Array.isArray(slots) || slots.length === 0)
    return res.status(400).json({ error: 'slots must be a non-empty array' });

  const validTypes = new Set(['face', 'online', 'either']);
  for (const s of slots) {
    if (!s.datetime || !validTypes.has(s.meeting_type))
      return res.status(400).json({ error: 'Invalid slot entry' });
  }

  try {
    const event = createEvent(title.trim(), description?.trim() ?? null, host_name.trim(), slots);
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  return res.json(event);
});

router.get('/:id/responses', (req: Request, res: Response) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const responses = getResponses(req.params.id);
  return res.json({ event, responses });
});

export default router;
