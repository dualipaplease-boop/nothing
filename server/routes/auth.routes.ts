import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_campus_parking_jwt_key_2026_xyz';

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

  // Get user's default vehicle if any
  const defaultVehicle = db.prepare('SELECT * FROM vehicles WHERE user_id = ? ORDER BY is_default DESC LIMIT 1').get(user.id);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    },
    defaultVehicle
  });
});

// Register endpoint
router.post('/register', (req, res) => {
  const { email, password, name, role = 'STUDENT', department } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const insertStmt = db.prepare(`
    INSERT INTO users (email, password, name, role, department)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(email.trim().toLowerCase(), hashedPassword, name.trim(), role, department || null);
  const userId = result.lastInsertRowid as number;

  const tokenPayload = { id: userId, email: email.trim().toLowerCase(), name: name.trim(), role };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: { id: userId, email: email.trim().toLowerCase(), name: name.trim(), role, department }
  });
});

// Get current user profile
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, email, name, role, department, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id = ?').all(user.id);
  res.json({ user, vehicles });
});

export default router;
