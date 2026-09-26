import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import db, { initDatabase } from '../server/db/database.ts';
import { seedDatabase } from '../server/db/seed.ts';
import { createBooking, cancelBooking, checkIntervalConflict } from '../server/services/booking.service.ts';
import { validateTicketCredential, performCheckIn, performCheckOut } from '../server/services/session.service.ts';
import { getDashboardOverview, getPeakDemandInsights } from '../server/services/analytics.service.ts';
import { generateOpaqueToken, hashToken } from '../server/utils/qrcode.ts';

describe('Smart Campus Parking System MVP Test Suite', () => {
  let studentId: number;
  let vehicleId: number;
  let slotId: number;
  let securityUserId: number;

  beforeAll(() => {
    seedDatabase();
    const student = db.prepare("SELECT id FROM users WHERE role = 'STUDENT'").get() as any;
    const security = db.prepare("SELECT id FROM users WHERE role = 'SECURITY'").get() as any;
    const vehicle = db.prepare("SELECT id FROM vehicles WHERE user_id = ?").get(student.id) as any;
    const slot = db.prepare("SELECT id FROM parking_slots WHERE slot_number = 'A-101'").get() as any;

    studentId = student.id;
    securityUserId = security.id;
    vehicleId = vehicle.id;
    slotId = slot.id;
  });

  it('should generate opaque QR credential without any PII', () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^TKT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(token).not.toContain('Alex');
    expect(token).not.toContain('student@campus.edu');
    expect(token).not.toContain('KA-01-AB-1234');

    const hash = hashToken(token);
    expect(hash.length).toBe(64);
  });

  it('should correctly validate interval conflicts and allow adjacent bookings', () => {
    const now = new Date();
    const start1 = new Date(now.getTime() + 1 * 3600 * 1000).toISOString(); // +1 hour
    const end1 = new Date(now.getTime() + 3 * 3600 * 1000).toISOString();   // +3 hours

    // Create initial booking
    const booking1 = createBooking({
      userId: studentId,
      vehicleId,
      slotId,
      startTime: start1,
      endTime: end1
    });

    expect(booking1.id).toBeDefined();

    // 1. Overlapping start (overlap: start2 < end1 AND end2 > start1)
    const start2 = new Date(now.getTime() + 2 * 3600 * 1000).toISOString(); // +2 hours
    const end2 = new Date(now.getTime() + 4 * 3600 * 1000).toISOString();   // +4 hours

    expect(checkIntervalConflict(slotId, start2, end2)).toBe(true);

    expect(() => {
      createBooking({
        userId: studentId,
        vehicleId,
        slotId,
        startTime: start2,
        endTime: end2
      });
    }).toThrow(/already reserved/);

    // 2. Adjacent booking (begins exactly when booking1 ends)
    const start3 = end1; // exact match
    const end3 = new Date(now.getTime() + 5 * 3600 * 1000).toISOString(); // +5 hours

    expect(checkIntervalConflict(slotId, start3, end3)).toBe(false);

    const booking3 = createBooking({
      userId: studentId,
      vehicleId,
      slotId,
      startTime: start3,
      endTime: end3
    });
    expect(booking3.id).toBeDefined();
  });

  it('should handle QR validation, check-in, and check-out workflow', () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // Started 10m ago (within 30m grace)
    const endTime = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

    // Get a fresh slot
    const freshSlot = db.prepare("SELECT id FROM parking_slots WHERE slot_number = 'A-102'").get() as any;

    const booking = createBooking({
      userId: studentId,
      vehicleId,
      slotId: freshSlot.id,
      startTime,
      endTime
    });

    // 1. Validate Ticket Credential
    const validation = validateTicketCredential(booking.ticket_token);
    expect(validation.valid).toBe(true);
    expect(validation.actionable).toBe('CHECK_IN');

    // 2. Perform Check-In
    const session: any = performCheckIn(booking.ticket_token, securityUserId);
    expect(session.status).toBe('ACTIVE');

    // Verify slot physically marked occupied
    const slotAfterCheckIn = db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(freshSlot.id) as any;
    expect(slotAfterCheckIn.status).toBe('SLOT_OCCUPIED');

    // 3. Repeat Check-In attempt must fail
    expect(() => {
      performCheckIn(booking.ticket_token, securityUserId);
    }).toThrow(/CHECKED IN|not eligible|already checked in/);

    // 4. Perform Check-Out
    const checkoutSession: any = performCheckOut(booking.ticket_token, securityUserId);
    expect(checkoutSession.status).toBe('COMPLETED');

    // Verify slot released to available
    const slotAfterCheckOut = db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(freshSlot.id) as any;
    expect(slotAfterCheckOut.status).toBe('SLOT_AVAILABLE');
  });

  it('should compute dashboard metrics and peak demand insights correctly', () => {
    const overview = getDashboardOverview();
    expect(overview.kpis.totalSlots).toBeGreaterThan(0);
    expect(overview.zoneStats.length).toBeGreaterThan(0);

    const analytics = getPeakDemandInsights();
    expect(analytics.hourlyTrend.length).toBe(24);
    expect(analytics.peakDemandInsight.busiestHour).toBeDefined();
  });
});
