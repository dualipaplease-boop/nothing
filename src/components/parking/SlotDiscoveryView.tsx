import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SlotGrid, Slot } from './SlotGrid';
import { Calendar, Clock, MapPin, Car, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface Zone {
  id: number;
  name: string;
  code: string;
  description: string;
}

interface Props {
  onBookingSuccess: (bookingId: number) => void;
  onOpenVehicleModal: () => void;
}

export const SlotDiscoveryView: React.FC<Props> = ({ onBookingSuccess, onOpenVehicleModal }) => {
  const { user, token, selectedVehicle } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  // Date/Time pickers (Default: today 1 hour from now for 2 hours duration)
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 3600 * 1000); // 2 hours

  const formatDateTimeLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState<string>(formatDateTimeLocal(defaultStart));
  const [endTime, setEndTime] = useState<string>(formatDateTimeLocal(defaultEnd));

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch zones
  useEffect(() => {
    fetch('/api/parking/zones')
      .then((res) => res.json())
      .then((data) => {
        if (data.zones) {
          setZones(data.zones);
          if (data.zones.length > 0) setSelectedZoneId(data.zones[0].id.toString());
        }
      })
      .catch((err) => console.error('Failed to fetch zones', err));
  }, []);

  // Fetch slots whenever zone, startTime, or endTime changes
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedZoneId) query.append('zoneId', selectedZoneId);
      if (startTime) query.append('startTime', new Date(startTime).toISOString());
      if (endTime) query.append('endTime', new Date(endTime).toISOString());
      if (selectedVehicle) query.append('vehicleType', selectedVehicle.vehicle_type);

      const res = await fetch(`/api/parking/slots?${query.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Failed to fetch slots', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedZoneId, startTime, endTime, selectedVehicle]);

  // WebSocket real-time updates listener
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (['BOOKING_CREATED', 'BOOKING_CANCELLED', 'SESSION_CHECKED_IN', 'SESSION_CHECKED_OUT', 'SLOT_STATUS_UPDATED'].includes(data.type)) {
          fetchSlots();
        }
      } catch (e) {
        console.error('WebSocket parse error', e);
      }
    };

    return () => ws.close();
  }, [selectedZoneId, startTime, endTime, selectedVehicle]);

  const handleCreateReservation = async () => {
    if (!selectedSlot || !selectedVehicle || !token) return;
    setBookingError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          slotId: selectedSlot.id,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reservation failed.');
      }

      setIsConfirmModalOpen(false);
      setSelectedSlot(null);
      fetchSlots();
      onBookingSuccess(data.booking.id);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateHours = () => {
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 0;
    return parseFloat(((e - s) / (1000 * 60 * 60)).toFixed(1));
  };

  return (
    <div>
      {/* Search & Filter Controls */}
      <div className="glass-card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} style={{ color: 'var(--accent-primary)' }} /> Select Campus Zone & Parking Interval
          </h2>

          {!selectedVehicle && (
            <button className="btn btn-danger" onClick={onOpenVehicleModal} style={{ fontSize: '0.8rem' }}>
              <AlertTriangle size={14} /> Please Select/Register a Vehicle First
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Zone Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              CAMPUS ZONE
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem'
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              START DATE & TIME
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem'
              }}
            />
          </div>

          {/* End Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              END DATE & TIME
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Legend Bar */}
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--status-available)' }}></span> Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--status-reserved)' }}></span> Reserved in Window
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--status-occupied)' }}></span> Occupied Session
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--status-maintenance)' }}></span> Out of Service
          </span>
        </div>
      </div>

      {/* Visual Slot Grid */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 600 }}>
            Live Slot Grid ({slots.filter(s => (s.computedStatus || s.status) === 'SLOT_AVAILABLE').length} Available)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click any green slot to reserve</span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading slot availability...
          </div>
        ) : (
          <SlotGrid
            slots={slots}
            selectedSlotId={selectedSlot?.id || null}
            onSelectSlot={(slot) => {
              if (!selectedVehicle) {
                onOpenVehicleModal();
                return;
              }
              setSelectedSlot(slot);
              setIsConfirmModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {isConfirmModalOpen && selectedSlot && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setIsConfirmModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Confirm Campus Slot Reservation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Review your reservation details below. A secure QR pass will be issued immediately.
            </p>

            {bookingError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {bookingError}
              </div>
            )}

            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected Bay:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>Slot {selectedSlot.slot_number} (Floor {selectedSlot.floor})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Vehicle Plate:</span>
                <span style={{ fontWeight: 700 }}>{selectedVehicle.plate_number} ({selectedVehicle.vehicle_type})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Start Time:</span>
                <span>{new Date(startTime).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>End Time:</span>
                <span>{new Date(endTime).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontWeight: 700 }}>
                <span>Duration & Estimated Fee:</span>
                <span style={{ color: 'var(--status-available)' }}>{calculateHours()} Hrs &bull; &dollar;{(calculateHours() * 20).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsConfirmModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5 }}
                onClick={handleCreateReservation}
                disabled={submitting}
              >
                {submitting ? 'Issuing Pass...' : 'Confirm & Generate QR Pass'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
