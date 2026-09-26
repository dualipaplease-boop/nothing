import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_campus_parking_jwt_key_2026_xyz';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: 'STUDENT' | 'STAFF' | 'SECURITY' | 'ADMIN';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function authorizeRoles(allowedRoles: ('STUDENT' | 'STAFF' | 'SECURITY' | 'ADMIN')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.` });
      return;
    }

    next();
  };
}
