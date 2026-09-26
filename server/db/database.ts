import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for concurrency and safety
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')) NOT NULL,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plate_number TEXT NOT NULL,
      vehicle_type TEXT CHECK(vehicle_type IN ('CAR', 'BIKE', 'EV')) NOT NULL,
      model TEXT,
      is_default INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parking_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      total_slots INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS parking_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
      slot_number TEXT NOT NULL,
      floor TEXT DEFAULT 'G',
      allowed_vehicle_type TEXT CHECK(allowed_vehicle_type IN ('CAR', 'BIKE', 'EV', 'ALL')) DEFAULT 'ALL',
      status TEXT CHECK(status IN ('SLOT_AVAILABLE', 'SLOT_RESERVED', 'SLOT_OCCUPIED', 'SLOT_MAINTENANCE')) DEFAULT 'SLOT_AVAILABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      slot_id INTEGER NOT NULL REFERENCES parking_slots(id),
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration_hours REAL NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0.00,
      status TEXT CHECK(status IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED')) DEFAULT 'CONFIRMED',
      ticket_token TEXT UNIQUE NOT NULL,
      ticket_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parking_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER UNIQUE REFERENCES bookings(id),
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      slot_id INTEGER NOT NULL REFERENCES parking_slots(id),
      checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checked_in_by INTEGER REFERENCES users(id),
      checked_out_at DATETIME,
      checked_out_by INTEGER REFERENCES users(id),
      status TEXT CHECK(status IN ('ACTIVE', 'COMPLETED')) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_slot_time ON bookings (slot_id, start_time, end_time, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_ticket_token ON bookings (ticket_token);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions (status, slot_id, vehicle_id);
  `);

  console.log('Database initialized successfully with schema and indexes.');
}

export default db;
