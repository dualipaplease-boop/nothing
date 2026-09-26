import { Router, Request, Response } from 'express';
import db from '../db/database.ts';
import { checkIntervalConflict } from '../services/booking.service.ts';

const router = Router();

// Get campus zones list
router.get('/zones', (req: Request, res: Response) => {
  const zones = db.prepare(`
    SELECT l.*, COUNT(s.id) as actual_slots_count
    FROM parking_locations l
    LEFT JOIN parking_slots s ON l.id = s.location_id
    GROUP BY l.id
  `).all();
  res.json({ zones });
});

// Get slots with dynamic interval availability computation
router.get('/slots', (req: Request, res: Response) => {
  const { zoneId, startTime, endTime, vehicleType } = req.query as {
    zoneId?: string;
    startTime?: string;
    endTime?: string;
    vehicleType?: string;
  };

  let query = `
    SELECT s.*, l.name as zone_name, l.code as zone_code
    FROM parking_slots s
    JOIN parking_locations l ON s.location_id = l.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (zoneId) {
    query += ` AND s.location_id = ?`;
    params.push(parseInt(zoneId, 10));
  }

  if (vehicleType && vehicleType !== 'ALL') {
    query += ` AND (s.allowed_vehicle_type = 'ALL' OR s.allowed_vehicle_type = ?)`;
    params.push(vehicleType);
  }

  query += ` ORDER BY s.slot_number ASC`;

  const slots = db.prepare(query).all(...params) as any[];

  // Compute computed interval status for requested time window
  const computedSlots = slots.map((slot) => {
    if (slot.status === 'SLOT_MAINTENANCE') {
      return { ...slot, computedStatus: 'SLOT_MAINTENANCE' };
    }

    // Check physical occupancy right now
    const activeSession = db.prepare("SELECT id FROM parking_sessions WHERE slot_id = ? AND status = 'ACTIVE'").get(slot.id);
    if (activeSession) {
      return { ...slot, computedStatus: 'SLOT_OCCUPIED' };
    }

    // Check interval conflict if time range provided
    if (startTime && endTime) {
      const hasConflict = checkIntervalConflict(slot.id, startTime, endTime);
      if (hasConflict) {
        return { ...slot, computedStatus: 'SLOT_RESERVED' };
      }
    }

    return { ...slot, computedStatus: 'SLOT_AVAILABLE' };
  });

  res.json({ slots: computedSlots });
});

export default router;
