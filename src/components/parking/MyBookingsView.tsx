import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QrCode, XCircle, Calendar, Clock, Car, MapPin, AlertCircle } from 'lucide-react';

interface Props {
  onOpenQRModal: (bookingId: number) => void;
}

export const MyBookingsView: React.FC<Props> = ({ onOpenQRModal }) => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this reservation? The slot will be released.')) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      console.error('Failed to cancel booking', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-reserved">Confirmed</span>;
      case 'ACTIVE':
        return <span className="badge badge-occupied">Parked / Active</span>;
      case 'COMPLETED':
        return <span className="badge badge-available">Completed</span>;
      case 'CANCELLED':
        return <span className="badge badge-maintenance">Cancelled</span>;
      default:
        return <span className="badge badge-maintenance">{status}</span>;
    }
  };

  if (loading) {
    return <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>Loading your reservations...</div>;
  }

  return (
    <div className="glass-card">
      <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={20} style={{ color: 'var(--accent-primary)' }} /> My Campus Parking Reservations
      </h2>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={36} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
          <p>You have no active or past campus parking reservations.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((b) => (
            <div
              key={b.id}
              style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                borderRadius: '12px', padding: '1.25rem', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    Slot {b.slot_number} &bull; {b.zone_name}
                  </span>
                  {getStatusBadge(b.status)}
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Car size={14} /> {b.plate_number} ({b.vehicle_type})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} /> {new Date(b.start_time).toLocaleString()} &ndash; {new Date(b.end_time).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                  Token: {b.ticket_token}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {b.status === 'CONFIRMED' && (
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }} onClick={() => onOpenQRModal(b.id)}>
                    <QrCode size={15} /> Show QR Pass
                  </button>
                )}

                {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => handleCancelBooking(b.id)}
                    disabled={cancellingId === b.id}
                  >
                    <XCircle size={15} /> {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
