import db from '../db/database.ts';
import { hashToken } from '../utils/qrcode.ts';
import { broadcastEvent } from './websocket.service.ts';
import dotenv from 'dotenv';

dotenv.config();

const GRACE_PERIOD_MINUTES = parseInt(process.env.GRACE_PERIOD_MINUTES || '30', 10);

export function validateTicketCredential(rawToken: string) {
  const token = rawToken.trim();
  const inputHash = hashToken(token);

  // Search by exact token or hash
  const booking = db.prepare(`
    SELECT b.*, v.plate_number, v.vehicle_type, v.model as vehicle_model,
           s.slot_number, s.floor, l.name as zone_name, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN parking_slots s ON b.slot_id = s.id
    JOIN parking_locations l ON s.location_id = l.id
    JOIN users u ON b.user_id = u.id
    WHERE b.ticket_token = ? OR b.ticket_hash = ?
  `).get(token, inputHash) as any;

  if (!booking) {
    return {
      valid: false,
      reason: 'INVALID_CREDENTIAL',
      message: 'Invalid or unknown QR ticket credential.'
    };
  }

  if (booking.status === 'CANCELLED') {
    return {
      valid: false,
      reason: 'BOOKING_CANCELLED',
      message: 'This reservation has been cancelled.',
      booking
    };
  }

  if (booking.status === 'COMPLETED') {
    return {
      valid: false,
      reason: 'BOOKING_COMPLETED',
      message: 'This parking pass has already completed checkout.',
      booking
    };
  }

  // Check existing session
  const activeSession = db.prepare(`
    SELECT * FROM parking_sessions WHERE booking_id = ? AND status = 'ACTIVE'
  `).get(booking.id) as any;

  const now = new Date();
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  // Time grace window calculation
  const windowStart = new Date(startTime.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
  const windowEnd = new Date(endTime.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);

  const isWithinTimeWindow = now >= windowStart && now <= windowEnd;

  if (activeSession) {
    return {
      valid: true,
      actionable: 'CHECK_OUT',
      message: `Vehicle ${booking.plate_number} is currently CHECKED IN at ${booking.slot_number}. Ready for Check-out.`,
      booking,
      session: activeSession,
      isWithinTimeWindow
    };
  }

  if (!isWithinTimeWindow) {
    if (now < windowStart) {
      return {
        valid: false,
        reason: 'EARLY_ENTRY',
        message: `Too early for check-in. Entry allowed starting ${windowStart.toLocaleTimeString()}.`,
        booking
      };
    } else {
      return {
        valid: false,
        reason: 'EXPIRED_ENTRY',
        message: `Reservation entry window expired at ${windowEnd.toLocaleTimeString()}.`,
        booking
      };
    }
  }

  return {
    valid: true,
    actionable: 'CHECK_IN',
    message: `Reservation confirmed for ${booking.user_name} (${booking.plate_number}) at ${booking.slot_number}. Ready for Check-in.`,
    booking
  };
}

export function performCheckIn(rawToken: string, securityUserId: number) {
  const validation = validateTicketCredential(rawToken);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  if (validation.actionable !== 'CHECK_IN') {
    throw new Error(validation.message || 'Ticket is not eligible for check-in.');
  }

  const booking = validation.booking;

  const checkInTx = db.transaction(() => {
    // Re-verify duplicate session inside transaction
    const existingSession = db.prepare("SELECT id FROM parking_sessions WHERE booking_id = ? AND status = 'ACTIVE'").get(booking.id);
    if (existingSession) {
      throw new Error('Vehicle is already checked in under an active session.');
    }

    // Re-verify vehicle duplicate active session
    const vehicleSession = db.prepare("SELECT id FROM parking_sessions WHERE vehicle_id = ? AND status = 'ACTIVE'").get(booking.vehicle_id);
    if (vehicleSession) {
      throw new Error(`Vehicle ${booking.plate_number} already has another active parking session.`);
    }

    // 1. Create Parking Session
    const sessionStmt = db.prepare(`
      INSERT INTO parking_sessions (booking_id, vehicle_id, slot_id, checked_in_at, checked_in_by, status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, 'ACTIVE')
    `);
    const result = sessionStmt.run(booking.id, booking.vehicle_id, booking.slot_id, securityUserId);
    const sessionId = result.lastInsertRowid as number;

    // 2. Update Booking status to ACTIVE
    db.prepare("UPDATE bookings SET status = 'ACTIVE' WHERE id = ?").run(booking.id);

    // 3. Update Slot status to OCCUPIED
    db.prepare("UPDATE parking_slots SET status = 'SLOT_OCCUPIED' WHERE id = ?").run(booking.slot_id);

    const session = db.prepare(`
      SELECT ps.*, v.plate_number, v.vehicle_type, s.slot_number, l.name as zone_name, u.name as user_name
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_slots s ON ps.slot_id = s.id
      JOIN parking_locations l ON s.location_id = l.id
      JOIN bookings b ON ps.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE ps.id = ?
    `).get(sessionId) as any;

    return session;
  });

  const session: any = checkInTx();

  broadcastEvent('SESSION_CHECKED_IN', {
    sessionId: session.id,
    bookingId: booking.id,
    slotId: booking.slot_id,
    plateNumber: booking.plate_number,
    slotNumber: booking.slot_number
  });

  return session;
}

export function performCheckOut(rawToken: string, securityUserId: number) {
  const validation = validateTicketCredential(rawToken);
  if (!validation.valid && validation.reason !== 'BOOKING_COMPLETED') {
    throw new Error(validation.message);
  }

  const booking = validation.booking;
  if (!booking) {
    throw new Error('Booking not found.');
  }

  const checkOutTx = db.transaction(() => {
    const activeSession = db.prepare("SELECT * FROM parking_sessions WHERE booking_id = ? AND status = 'ACTIVE'").get(booking.id) as any;
    if (!activeSession) {
      throw new Error(`No active parking session found for vehicle ${booking.plate_number}.`);
    }

    // 1. Close Session
    db.prepare(`
      UPDATE parking_sessions
      SET status = 'COMPLETED', checked_out_at = CURRENT_TIMESTAMP, checked_out_by = ?
      WHERE id = ?
    `).run(securityUserId, activeSession.id);

    // 2. Update Booking Status
    db.prepare("UPDATE bookings SET status = 'COMPLETED' WHERE id = ?").run(booking.id);

    // 3. Release Slot if no other active session
    const otherSession = db.prepare("SELECT id FROM parking_sessions WHERE slot_id = ? AND status = 'ACTIVE'").get(booking.slot_id);
    if (!otherSession) {
      db.prepare("UPDATE parking_slots SET status = 'SLOT_AVAILABLE' WHERE id = ? AND status != 'SLOT_MAINTENANCE'").run(booking.slot_id);
    }

    return db.prepare(`
      SELECT ps.*, v.plate_number, s.slot_number, l.name as zone_name
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_slots s ON ps.slot_id = s.id
      JOIN parking_locations l ON s.location_id = l.id
      WHERE ps.id = ?
    `).get(activeSession.id) as any;
  });

  const session: any = checkOutTx();

  broadcastEvent('SESSION_CHECKED_OUT', {
    sessionId: session.id,
    bookingId: booking.id,
    slotId: booking.slot_id,
    plateNumber: booking.plate_number
  });

  return session;
}

export function getActiveSessionsList() {
  return db.prepare(`
    SELECT ps.*, v.plate_number, v.vehicle_type, v.model, s.slot_number, s.floor, l.name as zone_name,
           u.name as user_name, u.email as user_email, b.start_time, b.end_time, b.ticket_token
    FROM parking_sessions ps
    JOIN vehicles v ON ps.vehicle_id = v.id
    JOIN parking_slots s ON ps.slot_id = s.id
    JOIN parking_locations l ON s.location_id = l.id
    JOIN bookings b ON ps.booking_id = b.id
    JOIN users u ON b.user_id = u.id
    WHERE ps.status = 'ACTIVE'
    ORDER BY ps.checked_in_at DESC
  `).all();
}
