import bcrypt from 'bcryptjs';
import db, { initDatabase } from './database.ts';
import crypto from 'crypto';

export function seedDatabase() {
  initDatabase();

  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Clear existing demo data
  db.exec(`
    DELETE FROM parking_sessions;
    DELETE FROM bookings;
    DELETE FROM vehicles;
    DELETE FROM parking_slots;
    DELETE FROM parking_locations;
    DELETE FROM users;
  `);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (email, password, name, role, department)
    VALUES (?, ?, ?, ?, ?)
  `);

  const studentResult = insertUser.run('student@campus.edu', hashedPassword, 'Alex Student', 'STUDENT', 'Computer Science');
  const staffResult = insertUser.run('staff@campus.edu', hashedPassword, 'Dr. Sarah Staff', 'STAFF', 'Electrical Engineering');
  const securityResult = insertUser.run('security@campus.edu', hashedPassword, 'Officer John Security', 'SECURITY', 'Campus Safety');
  const adminResult = insertUser.run('admin@campus.edu', hashedPassword, 'Campus Admin', 'ADMIN', 'Facility Management');

  const studentId = studentResult.lastInsertRowid as number;
  const staffId = staffResult.lastInsertRowid as number;
  const securityId = securityResult.lastInsertRowid as number;

  // 2. Seed Vehicles
  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (user_id, plate_number, vehicle_type, model, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);

  const v1 = insertVehicle.run(studentId, 'KA-01-AB-1234', 'CAR', 'Honda Civic', 1);
  const v2 = insertVehicle.run(studentId, 'KA-01-BK-9999', 'BIKE', 'Yamaha FZ', 0);
  const v3 = insertVehicle.run(staffId, 'KA-05-EV-5555', 'EV', 'Tesla Model 3', 1);

  const studentCarId = v1.lastInsertRowid as number;
  const staffEvId = v3.lastInsertRowid as number;

  // 3. Seed Zones & Slots
  const insertZone = db.prepare(`
    INSERT INTO parking_locations (name, code, description, total_slots)
    VALUES (?, ?, ?, ?)
  `);

  const zA = insertZone.run('Zone A - Main Campus Block', 'ZONE_A', 'Central Administrative & Main Building Parking', 8);
  const zB = insertZone.run('Zone B - Science & Tech Block', 'ZONE_B', 'Engineering & Technology Department Parking', 8);
  const zC = insertZone.run('Zone C - Central Library', 'ZONE_C', 'Quiet Study & Library Parking Area', 6);
  const zD = insertZone.run('Zone D - Student Hostel Area', 'ZONE_D', 'Residential & Hostel Complex Parking', 6);

  const zoneAId = zA.lastInsertRowid as number;
  const zoneBId = zB.lastInsertRowid as number;
  const zoneCId = zC.lastInsertRowid as number;
  const zoneDId = zD.lastInsertRowid as number;

  const insertSlot = db.prepare(`
    INSERT INTO parking_slots (location_id, slot_number, floor, allowed_vehicle_type, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Zone A slots
  insertSlot.run(zoneAId, 'A-101', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-102', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-103', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-104', 'G', 'EV', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-105', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-106', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneAId, 'A-107', 'G', 'CAR', 'SLOT_MAINTENANCE');
  insertSlot.run(zoneAId, 'A-108', 'G', 'ALL', 'SLOT_AVAILABLE');

  // Zone B slots
  insertSlot.run(zoneBId, 'B-201', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-202', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-203', 'G', 'EV', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-204', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-205', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-206', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-207', '1st', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneBId, 'B-208', '1st', 'CAR', 'SLOT_AVAILABLE');

  // Zone C & D slots
  insertSlot.run(zoneCId, 'C-301', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneCId, 'C-302', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneCId, 'C-303', 'G', 'EV', 'SLOT_AVAILABLE');
  insertSlot.run(zoneCId, 'C-304', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneCId, 'C-305', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneCId, 'C-306', 'G', 'CAR', 'SLOT_AVAILABLE');

  insertSlot.run(zoneDId, 'D-401', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneDId, 'D-402', 'G', 'BIKE', 'SLOT_AVAILABLE');
  insertSlot.run(zoneDId, 'D-403', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneDId, 'D-404', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneDId, 'D-405', 'G', 'CAR', 'SLOT_AVAILABLE');
  insertSlot.run(zoneDId, 'D-406', 'G', 'CAR', 'SLOT_AVAILABLE');

  // 4. Seed Historical Bookings & Sessions for Peak-Hour Insights
  const insertBooking = db.prepare(`
    INSERT INTO bookings (user_id, vehicle_id, slot_id, start_time, end_time, duration_hours, total_amount, status, ticket_token, ticket_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT INTO parking_sessions (booking_id, vehicle_id, slot_id, checked_in_at, checked_in_by, checked_out_at, checked_out_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Get slot A-101 id
  const slotA101 = db.prepare('SELECT id FROM parking_slots WHERE slot_number = ?').get('A-101') as { id: number };

  const now = new Date();
  
  // Seed past completed sessions for peak demand graphics (Peak around 09:00 - 11:00 AM)
  for (let i = 1; i <= 10; i++) {
    const startTime = new Date(now.getTime() - (i * 24 * 3600 * 1000));
    startTime.setHours(9, 0, 0, 0); // 9:00 AM peak
    const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000); // 11:00 AM

    const token = `TKT-DEMO-${i}-${crypto.randomBytes(4).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const bk = insertBooking.run(
      studentId, studentCarId, slotA101.id,
      startTime.toISOString(), endTime.toISOString(),
      2.0, 0.0, 'COMPLETED', token, hash, startTime.toISOString()
    );

    insertSession.run(
      bk.lastInsertRowid, studentCarId, slotA101.id,
      startTime.toISOString(), securityId, endTime.toISOString(), securityId, 'COMPLETED'
    );
  }

  console.log('Database seeded successfully with demo users, vehicles, zones, slots, and historical records.');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
}
