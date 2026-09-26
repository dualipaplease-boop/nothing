import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.ts';
import { createBooking, cancelBooking, getUserBookings, getBookingById } from '../services/booking.service.ts';
import { generateQRCodeDataURL } from '../utils/qrcode.ts';

const router = Router();

// Create booking
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, slotId, startTime, endTime } = req.body;
    if (!vehicleId || !slotId || !startTime || !endTime) {
      res.status(400).json({ error: 'Missing required booking fields (vehicleId, slotId, startTime, endTime).' });
      return;
    }

    const booking = createBooking({
      userId: req.user!.id,
      vehicleId: parseInt(vehicleId, 10),
      slotId: parseInt(slotId, 10),
      startTime,
      endTime
    });

    const qrDataURL = await generateQRCodeDataURL(booking.ticket_token);

    res.status(201).json({
      message: 'Reservation created successfully',
      booking,
      qrDataURL
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create reservation.' });
  }
});

// Get user bookings history
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const bookings = getUserBookings(req.user!.id);
  res.json({ bookings });
});

// Get booking detail
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const bookingId = parseInt(req.params.id as string, 10);
  const booking = getBookingById(bookingId) as any;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.user_id !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SECURITY') {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  res.json({ booking });
});

// Get generated QR code for booking
router.get('/:id/qr', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    const booking = getBookingById(bookingId) as any;
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (booking.user_id !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SECURITY') {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    const qrDataURL = await generateQRCodeDataURL(booking.ticket_token);
    res.json({
      bookingId: booking.id,
      ticketToken: booking.ticket_token,
      qrDataURL,
      details: {
        slotNumber: booking.slot_number,
        zoneName: booking.zone_name,
        plateNumber: booking.plate_number,
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: booking.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
});

// Cancel booking
router.post('/:id/cancel', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    const isAdmin = req.user!.role === 'ADMIN';
    const cancelled = cancelBooking(bookingId, req.user!.id, isAdmin);
    res.json({ message: 'Reservation cancelled successfully.', booking: cancelled });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to cancel reservation.' });
  }
});

export default router;
