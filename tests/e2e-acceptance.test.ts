import { describe, it, expect, beforeAll } from 'vitest';
import db from '../server/db/database.ts';
import { seedDatabase } from '../server/db/seed.ts';
import { createBooking, cancelBooking, getUserBookings } from '../server/services/booking.service.ts';
import { validateTicketCredential, performCheckIn, performCheckOut, getActiveSessionsList } from '../server/services/session.service.ts';
import { getDashboardOverview } from '../server/services/analytics.service.ts';

describe('FINAL END-TO-END ACCEPTANCE FLOW (15 STEPS)', () => {
  let studentUser: any;
  let securityUser: any;
  let studentVehicle: any;
  let chosenSlot: any;
  let bookingPass: any;
  let activeSession: any;

  beforeAll(() => {
    seedDatabase();
  });

  it('Step 1: Student/Staff authenticates', () => {
    studentUser = db.prepare("SELECT * FROM users WHERE role = 'STUDENT'").get();
    expect(studentUser).toBeDefined();
    expect(studentUser.email).toBe('student@campus.edu');
  });

  it('Step 2: Registers or selects a vehicle', () => {
    studentVehicle = db.prepare("SELECT * FROM vehicles WHERE user_id = ?").get(studentUser.id);
    expect(studentVehicle).toBeDefined();
    expect(studentVehicle.plate_number).toBe('KA-01-AB-1234');
  });

  it('Step 3: Views current/time-specific parking availability', () => {
    const slots = db.prepare("SELECT * FROM parking_slots WHERE status = 'SLOT_AVAILABLE'").all();
    expect(slots.length).toBeGreaterThan(0);
    chosenSlot = slots[0];
  });

  it('Step 4 & 5: Chooses zone, date, start/end time, and slot to create reservation', () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // +10 mins
    const endTime = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();  // +2 hours

    bookingPass = createBooking({
      userId: studentUser.id,
      vehicleId: studentVehicle.id,
      slotId: chosenSlot.id,
      startTime,
      endTime
    });

    expect(bookingPass).toBeDefined();
    expect(bookingPass.id).toBeGreaterThan(0);
  });

  it('Step 6: Confirms persisted booking and generated opaque QR pass', () => {
    const persisted = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingPass.id) as any;
    expect(persisted).toBeDefined();
    expect(persisted.ticket_token).toMatch(/^TKT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it('Step 7: Security user authenticates', () => {
    securityUser = db.prepare("SELECT * FROM users WHERE role = 'SECURITY'").get();
    expect(securityUser).toBeDefined();
    expect(securityUser.role).toBe('SECURITY');
  });

  it('Step 8 & 9: Scans QR / token fallback and backend validates real reservation', () => {
    const validation = validateTicketCredential(bookingPass.ticket_token);
    expect(validation.valid).toBe(true);
    expect(validation.actionable).toBe('CHECK_IN');
    expect(validation.booking.plate_number).toBe(studentVehicle.plate_number);
  });

  it('Step 10: Security checks the vehicle in', () => {
    activeSession = performCheckIn(bookingPass.ticket_token, securityUser.id);
    expect(activeSession).toBeDefined();
    expect(activeSession.status).toBe('ACTIVE');
  });

  it('Step 11: Active session appears and slot becomes occupied', () => {
    const activeSessions = getActiveSessionsList();
    const found = activeSessions.find((s: any) => s.id === activeSession.id);
    expect(found).toBeDefined();

    const slotState = db.prepare("SELECT status FROM parking_slots WHERE id = ?").get(chosenSlot.id) as any;
    expect(slotState.status).toBe('SLOT_OCCUPIED');
  });

  it('Step 12: Security scans the same valid ticket/session credential to check out', () => {
    const validationBeforeCheckout = validateTicketCredential(bookingPass.ticket_token);
    expect(validationBeforeCheckout.valid).toBe(true);
    expect(validationBeforeCheckout.actionable).toBe('CHECK_OUT');

    const completedSession: any = performCheckOut(bookingPass.ticket_token, securityUser.id);
    expect(completedSession.status).toBe('COMPLETED');
  });

  it('Step 13: Session closes and slot becomes available', () => {
    const slotState = db.prepare("SELECT status FROM parking_slots WHERE id = ?").get(chosenSlot.id) as any;
    expect(slotState.status).toBe('SLOT_AVAILABLE');

    const activeSessions = getActiveSessionsList();
    const found = activeSessions.find((s: any) => s.id === activeSession.id);
    expect(found).toBeUndefined();
  });

  it('Step 14: Student history and admin dashboard reflect updated persisted state', () => {
    const userHistory = getUserBookings(studentUser.id);
    expect(userHistory.length).toBeGreaterThan(0);

    const overview = getDashboardOverview();
    expect(overview.kpis.totalSlots).toBeGreaterThan(0);
  });

  it('Step 15: Attempt a conflicting booking and prove backend rejects it', () => {
    const now = new Date();
    const start1 = new Date(now.getTime() + 1 * 3600 * 1000).toISOString();
    const end1 = new Date(now.getTime() + 3 * 3600 * 1000).toISOString();

    const b1 = createBooking({
      userId: studentUser.id,
      vehicleId: studentVehicle.id,
      slotId: chosenSlot.id,
      startTime: start1,
      endTime: end1
    });

    const conflictingStart = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
    const conflictingEnd = new Date(now.getTime() + 4 * 3600 * 1000).toISOString();

    expect(() => {
      createBooking({
        userId: studentUser.id,
        vehicleId: studentVehicle.id,
        slotId: chosenSlot.id,
        startTime: conflictingStart,
        endTime: conflictingEnd
      });
    }).toThrow(/already reserved/);
  });
});
