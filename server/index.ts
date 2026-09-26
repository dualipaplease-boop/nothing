import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import db, { initDatabase } from './db/database.ts';
import { seedDatabase } from './db/seed.ts';
import { initWebSocketServer } from './services/websocket.service.ts';

import authRoutes from './routes/auth.routes.ts';
import vehicleRoutes from './routes/vehicle.routes.ts';
import parkingRoutes from './routes/parking.routes.ts';
import bookingRoutes from './routes/booking.routes.ts';
import securityRoutes from './routes/security.routes.ts';
import adminRoutes from './routes/admin.routes.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize DB and seed if empty
initDatabase();
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  console.log('No users found. Seeding initial demo database...');
  seedDatabase();
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize WebSocket server
initWebSocketServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Smart Campus Parking System MVP',
    timestamp: new Date().toISOString(),
    timezone: process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata'
  });
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`🚀 Smart Campus Parking Backend running on http://localhost:${PORT}`);
});

export { app, server };
