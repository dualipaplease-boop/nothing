import db from '../db/database.ts';
import { generateOpaqueToken, hashToken } from '../utils/qrcode.ts';
import { broadcastEvent } from './websocket.service.ts';

export interface CreateBookingParams {
  userId: number;
  vehicleId: number;
  slotId: number;
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export function checkIntervalConflict(slotId: number, startTimeIso: string, endTimeIso: string, excludeBookingId?: number): boolean {
  const reqStart = new Date(startTimeIso).toISOString();
  const reqEnd = new Date(endTimeIso).toISOString();

  // Overlap query: existing.start < reqEnd AND existing.end > reqStart
  let query = `
    SELECT id FROM bookings
    WHERE slot_id = ?
      AND status IN ('CONFIRMED', 'ACTIVE', 'PENDING')
      AND start_time < ?
      AND end_time > ?
  `;
  const params: any[] = [slotId, reqEnd, reqStart];

  if (excludeBookingId) {
    query += ` AND id != ?`;
    params.push(excludeBookingId);
  }

  const existing = db.prepare(query).get(...params);
  return !!existing;
}

export function createBooking(params: CreateBookingParams) {
  const { userId, vehicleId, slotId, startTime, endTime } = params;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date format.');
  }

  if (end <= start) {
    throw new Error('End time must be after start time.');
  }

  // Allow booking starting up to 30 minutes in past to accommodate immediate check-in and clock drift
  if (start.getTime() < now.getTime() - 30 * 60 * 1000) {
    throw new Error('Reservation start time is too far in the past.');
  }

  // Perform atomic transaction
  const executeBookingTx = db.transaction(() => {
    // 1. Verify User & Vehicle ownership
    const vehicle = db.prepare('SELECT id, user_id, vehicle_type FROM vehicles WHERE id = ? AND user_id = ?').get(vehicleId, userId) as any;
    if (!vehicle) {
      throw new Error('Vehicle not found or does not belong to the authenticated user.');
    }

    // 2. Verify Slot
    const slot = db.prepare(`
      SELECT s.id, s.slot_number, s.status, s.allowed_vehicle_type, l.name as zone_name, l.id as zone_id
      FROM parking_slots s
      JOIN parking_locations l ON s.location_id = l.id
      WHERE s.id = ?
    `).get(slotId) as any;

    if (!slot) {
      throw new Error('Parking slot not found.');
    }

    if (slot.status === 'SLOT_MAINTENANCE') {
      throw new Error(`Slot ${slot.slot_number} is currently out of service (Maintenance).`);
    }

    if (slot.allowed_vehicle_type !== 'ALL' && slot.allowed_vehicle_type !== vehicle.vehicle_type) {
      throw new Error(`Slot ${slot.slot_number} accepts ${slot.allowed_vehicle_type} vehicles only, but vehicle is ${vehicle.vehicle_type}.`);
    }

    // 3. Check Overlapping Bookings
    const hasConflict = checkIntervalConflict(slotId, start.toISOString(), end.toISOString());
    if (hasConflict) {
      throw new Error(`Slot ${slot.slot_number} is already reserved for the selected time interval.`);
    }

    // 4. Calculate duration & price
    const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const totalAmount = parseFloat((durationHours * 20.0).toFixed(2)); // Standard campus rate: 20 per hour

    // 5. Generate Opaque Token Credentials
    const ticketToken = generateOpaqueToken();
    const ticketHash = hashToken(ticketToken);

    // 6. Insert Booking Record
    const insertStmt = db.prepare(`
      INSERT INTO bookings (user_id, vehicle_id, slot_id, start_time, end_time, duration_hours, total_amount, status, ticket_token, ticket_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
    `);

    const result = insertStmt.run(
      userId,
      vehicleId,
      slotId,
      start.toISOString(),
      end.toISOString(),
      durationHours,
      totalAmount,
      ticketToken,
      ticketHash
    );

    const bookingId = result.lastInsertRowid as number;

    // Fetch created booking
    const booking = db.prepare(`
      SELECT b.*, v.plate_number, v.vehicle_type, s.slot_number, s.floor, l.name as zone_name
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN parking_slots s ON b.slot_id = s.id
      JOIN parking_locations l ON s.location_id = l.id
      WHERE b.id = ?
    `).get(bookingId) as any;

    return booking;
  });

  const createdBooking = executeBookingTx();

  // Broadcast WebSocket update for live slot & dashboard sync
  broadcastEvent('BOOKING_CREATED', {
    bookingId: createdBooking.id,
    slotId: createdBooking.slot_id,
    zoneName: createdBooking.zone_name,
    startTime: createdBooking.start_time,
    endTime: createdBooking.end_time
  });

  return createdBooking;
}

export function cancelBooking(bookingId: number, userId: number, isAdmin = false) {
  const executeCancelTx = db.transaction(() => {
    let booking: any;
    if (isAdmin) {
      booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    } else {
      booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(bookingId, userId);
    }

    if (!booking) {
      throw new Error('Booking not found or access denied.');
    }

    if (booking.status === 'CANCELLED') {
      return booking; // Idempotent
    }

    if (booking.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed booking.');
    }

    // Update status to CANCELLED
    db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?").run(bookingId);

    // If there was an active session, complete it
    db.prepare("UPDATE parking_sessions SET status = 'COMPLETED', checked_out_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status = 'ACTIVE'").run(bookingId);

    // Check if slot has any other active session
    const activeSession = db.prepare("SELECT id FROM parking_sessions WHERE slot_id = ? AND status = 'ACTIVE'").get(booking.slot_id);
    if (!activeSession) {
      db.prepare("UPDATE parking_slots SET status = 'SLOT_AVAILABLE' WHERE id = ? AND status != 'SLOT_MAINTENANCE'").run(booking.slot_id);
    }

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  });

  const cancelled = executeCancelTx();

  broadcastEvent('BOOKING_CANCELLED', { bookingId: cancelled.id, slotId: cancelled.slot_id });
  return cancelled;
}

export function getUserBookings(userId: number) {
  return db.prepare(`
    SELECT b.*, v.plate_number, v.vehicle_type, s.slot_number, s.floor, l.name as zone_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN parking_slots s ON b.slot_id = s.id
    JOIN parking_locations l ON s.location_id = l.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);
}

export function getBookingById(bookingId: number) {
  return db.prepare(`
    SELECT b.*, v.plate_number, v.vehicle_type, s.slot_number, s.floor, l.name as zone_name, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN parking_slots s ON b.slot_id = s.id
    JOIN parking_locations l ON s.location_id = l.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `).get(bookingId);
}
