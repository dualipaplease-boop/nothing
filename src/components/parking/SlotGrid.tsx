import React from 'react';
import { Car, Zap, Bike, AlertCircle, CheckCircle } from 'lucide-react';

export interface Slot {
  id: number;
  location_id: number;
  slot_number: string;
  floor: string;
  allowed_vehicle_type: 'CAR' | 'BIKE' | 'EV' | 'ALL';
  status: 'SLOT_AVAILABLE' | 'SLOT_RESERVED' | 'SLOT_OCCUPIED' | 'SLOT_MAINTENANCE';
  computedStatus?: 'SLOT_AVAILABLE' | 'SLOT_RESERVED' | 'SLOT_OCCUPIED' | 'SLOT_MAINTENANCE';
  zone_name?: string;
}

interface SlotGridProps {
  slots: Slot[];
  selectedSlotId: number | null;
  onSelectSlot: (slot: Slot) => void;
}

export const SlotGrid: React.FC<SlotGridProps> = ({ slots, selectedSlotId, onSelectSlot }) => {
  const getVehicleIcon = (type: string) => {
    if (type === 'EV') return <Zap size={14} style={{ color: '#f59e0b' }} />;
    if (type === 'BIKE') return <Bike size={14} style={{ color: '#3b82f6' }} />;
    return <Car size={14} style={{ color: '#10b981' }} />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SLOT_AVAILABLE':
        return <span className="badge badge-available">Available</span>;
      case 'SLOT_RESERVED':
        return <span className="badge badge-reserved">Reserved</span>;
      case 'SLOT_OCCUPIED':
        return <span className="badge badge-occupied">Occupied</span>;
      case 'SLOT_MAINTENANCE':
        return <span className="badge badge-maintenance">Maintenance</span>;
      default:
        return null;
    }
  };

  if (slots.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
        <AlertCircle size={36} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
        <p>No parking slots found matching the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="slot-grid">
      {slots.map((slot) => {
        const effectiveStatus = slot.computedStatus || slot.status;
        const isAvailable = effectiveStatus === 'SLOT_AVAILABLE';
        const isSelected = selectedSlotId === slot.id;

        let statusClass = 'available';
        if (effectiveStatus === 'SLOT_RESERVED') statusClass = 'reserved';
        if (effectiveStatus === 'SLOT_OCCUPIED') statusClass = 'occupied';
        if (effectiveStatus === 'SLOT_MAINTENANCE') statusClass = 'maintenance';
        if (isSelected) statusClass += ' selected';

        return (
          <div
            key={slot.id}
            className={`slot-card ${statusClass}`}
            onClick={() => {
              if (isAvailable) onSelectSlot(slot);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {getVehicleIcon(slot.allowed_vehicle_type)} {slot.allowed_vehicle_type}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Fl. {slot.floor}</span>
            </div>

            <div className="slot-number">{slot.slot_number}</div>

            <div style={{ marginTop: '0.5rem' }}>
              {getStatusBadge(effectiveStatus)}
            </div>

            {isSelected && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                &check; Selected
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
