import React, { useState } from 'react';
import { useAuth, Vehicle } from '../../context/AuthContext';
import { Car, Plus, Check, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleSelectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { vehicles, selectedVehicle, setSelectedVehicle, token, refreshVehicles } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!plateNumber.trim()) {
      setError('License plate number is required.');
      return;
    }

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plateNumber, vehicleType, model })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add vehicle.');
      }

      await refreshVehicles();
      setSelectedVehicle(data.vehicle);
      setShowAddForm(false);
      setPlateNumber('');
      setModel('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 600 }}>Select or Register Vehicle</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {!showAddForm ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicle(v);
                    onClose();
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem', borderRadius: '8px',
                    border: selectedVehicle?.id === v.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: selectedVehicle?.id === v.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Car size={20} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{v.plate_number}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {v.model ? `${v.model} (${v.vehicle_type})` : v.vehicle_type}
                      </div>
                    </div>
                  </div>
                  {selectedVehicle?.id === v.id && <Check size={18} style={{ color: 'var(--accent-primary)' }} />}
                </div>
              ))}
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddForm(true)}>
              <Plus size={16} /> Register New Vehicle
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                License Plate Number *
              </label>
              <input
                type="text"
                placeholder="e.g. KA-01-AB-1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                style={{
                  width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Vehicle Category *
              </label>
              <select
                value={vehicleType}
                onChange={(e: any) => setVehicleType(e.target.value)}
                style={{
                  width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff'
                }}
              >
                <option value="CAR">Car (4-Wheeler)</option>
                <option value="BIKE">Bike / Two-Wheeler</option>
                <option value="EV">Electric Vehicle (EV Charging Bay)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Model / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Honda Civic"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Save Vehicle
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
