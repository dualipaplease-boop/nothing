import { Router, Response } from 'express';
import db from '../db/database.ts';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth.ts';
import { getDashboardOverview, getPeakDemandInsights, getRecentActivityLog } from '../services/analytics.service.ts';
import { broadcastEvent } from '../services/websocket.service.ts';

const router = Router();

// Protect all admin routes for ADMIN role
router.use(authenticate, authorizeRoles(['ADMIN']));

// Admin Dashboard KPIs
router.get('/dashboard', (req: AuthRequest, res: Response) => {
  const overview = getDashboardOverview();
  res.json(overview);
});

// Admin Peak Demand & Hourly Analytics
router.get('/analytics', (req: AuthRequest, res: Response) => {
  const analytics = getPeakDemandInsights();
  res.json(analytics);
});

// Recent activity feed
router.get('/activity', (req: AuthRequest, res: Response) => {
  const activity = getRecentActivityLog(20);
  res.json({ activity });
});

// Update slot status (e.g. set Maintenance)
router.patch('/slots/:id/status', (req: AuthRequest, res: Response) => {
  const slotId = parseInt(req.params.id as string, 10);
  const { status } = req.body;

  if (!['SLOT_AVAILABLE', 'SLOT_MAINTENANCE'].includes(status)) {
    res.status(400).json({ error: 'Status must be SLOT_AVAILABLE or SLOT_MAINTENANCE.' });
    return;
  }

  const slot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(slotId);
  if (!slot) {
    res.status(404).json({ error: 'Slot not found.' });
    return;
  }

  db.prepare('UPDATE parking_slots SET status = ? WHERE id = ?').run(status, slotId);
  const updatedSlot = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get(slotId);

  broadcastEvent('SLOT_STATUS_UPDATED', { slotId, status });
  res.json({ message: 'Slot status updated successfully', slot: updatedSlot });
});

export default router;
