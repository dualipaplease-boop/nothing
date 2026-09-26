import { Router, Response } from 'express';
import db from '../db/database.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// List vehicles for authenticated user
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ vehicles });
});

// Register new vehicle
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const { plateNumber, vehicleType = 'CAR', model } = req.body;
  if (!plateNumber) {
    res.status(400).json({ error: 'License plate number is required.' });
    return;
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // Check if plate already registered by this user
  const existing = db.prepare('SELECT id FROM vehicles WHERE user_id = ? AND plate_number = ?').get(req.user!.id, cleanPlate);
  if (existing) {
    res.status(400).json({ error: 'Vehicle with this license plate is already registered under your account.' });
    return;
  }

  // Count existing vehicles to determine default status
  const countRow = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE user_id = ?').get(req.user!.id) as { count: number };
  const isDefault = countRow.count === 0 ? 1 : 0;

  const insertStmt = db.prepare(`
    INSERT INTO vehicles (user_id, plate_number, vehicle_type, model, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(req.user!.id, cleanPlate, vehicleType, model || null, isDefault);
  const vehicleId = result.lastInsertRowid as number;

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
  res.status(201).json({ message: 'Vehicle registered successfully', vehicle });
});

export default router;
