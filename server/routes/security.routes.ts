import { Router, Response } from 'express';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth.ts';
import { validateTicketCredential, performCheckIn, performCheckOut, getActiveSessionsList } from '../services/session.service.ts';

const router = Router();

// Protect all security routes for SECURITY or ADMIN roles
router.use(authenticate, authorizeRoles(['SECURITY', 'ADMIN']));

// Validate QR Ticket Credential
router.post('/validate-ticket', (req: AuthRequest, res: Response) => {
  const { ticketToken } = req.body;
  if (!ticketToken) {
    res.status(400).json({ error: 'Ticket token is required for validation.' });
    return;
  }

  const result = validateTicketCredential(ticketToken);
  res.json(result);
});

// Perform Security Check-In
router.post('/check-in', (req: AuthRequest, res: Response) => {
  try {
    const { ticketToken } = req.body;
    if (!ticketToken) {
      res.status(400).json({ error: 'Ticket token is required for check-in.' });
      return;
    }

    const session = performCheckIn(ticketToken, req.user!.id);
    res.status(200).json({
      message: 'Vehicle checked in successfully. Parking session started.',
      session
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Check-in failed.' });
  }
});

// Perform Security Check-Out
router.post('/check-out', (req: AuthRequest, res: Response) => {
  try {
    const { ticketToken } = req.body;
    if (!ticketToken) {
      res.status(400).json({ error: 'Ticket token is required for check-out.' });
      return;
    }

    const session = performCheckOut(ticketToken, req.user!.id);
    res.status(200).json({
      message: 'Vehicle checked out successfully. Parking session completed.',
      session
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Check-out failed.' });
  }
});

// List Active Sessions
router.get('/active-sessions', (req: AuthRequest, res: Response) => {
  const activeSessions = getActiveSessionsList();
  res.json({ activeSessions });
});

export default router;
