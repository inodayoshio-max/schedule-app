import { Router, Request, Response } from 'express';
import { createResponse } from '../db/queries';
import type { MeetingFormat } from '../db/queries';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const {
    eventId,
    customerName,
    customerEmail,
    responseType,
    selectedSlotId,
    meetingFormat,
    meetingUrl,
    proposedDatetimes,
  } = req.body as {
    eventId?: string;
    customerName?: string;
    customerEmail?: string;
    responseType?: 'selected' | 'proposed';
    selectedSlotId?: string;
    meetingFormat?: MeetingFormat;
    meetingUrl?: string;
    proposedDatetimes?: string[];
  };

  if (!eventId) return res.status(400).json({ error: 'eventId is required' });
  if (!customerName?.trim()) return res.status(400).json({ error: 'customerName is required' });
  if (responseType !== 'selected' && responseType !== 'proposed')
    return res.status(400).json({ error: 'responseType must be selected or proposed' });
  if (responseType === 'selected' && !selectedSlotId)
    return res.status(400).json({ error: 'selectedSlotId is required' });
  if (responseType === 'proposed' && (!Array.isArray(proposedDatetimes) || proposedDatetimes.length === 0))
    return res.status(400).json({ error: 'proposedDatetimes is required' });

  try {
    createResponse(
      eventId,
      customerName.trim(),
      customerEmail?.trim() ?? null,
      responseType,
      selectedSlotId ?? null,
      meetingFormat ?? null,
      meetingUrl ?? null,
      proposedDatetimes ?? []
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save response' });
  }
});

export default router;
