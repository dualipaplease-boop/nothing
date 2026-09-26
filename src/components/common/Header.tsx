import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Car, Shield, User, BarChart2, Calendar, LogOut, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenVehicleModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenVehicleModal }) => {
  const { user, selectedVehicle, loginAsRole, logout } = useAuth();

  return (
    <header className="glass-card mb-6" style={{ borderRadius: '0 0 16px 16px', padding: '1rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
          }}>
            <Car size={24} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              PARKEASE <span style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 600 }}>CAMPUS MVP</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Smart Parking & Security Validation System</p>
          </div>
        </div>

        {/* Demo Quick Role Switcher Bar */}
        <div className="role-switcher">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Demo Role:</span>
          {(['STUDENT', 'STAFF', 'SECURITY', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              className={`role-btn ${user?.role === r ? 'active' : ''}`}
              onClick={() => {
                loginAsRole(r);
                if (r === 'SECURITY') setActiveTab('security');
                else if (r === 'ADMIN') setActiveTab('admin');
                else setActiveTab('slots');
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* User & Active Vehicle Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedVehicle && (
            <button
              onClick={onOpenVehicleModal}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', gap: '0.4rem' }}
              title="Click to select or register vehicle"
            >
              <Car size={15} style={{ color: 'var(--accent-primary)' }} />
              <span>{selectedVehicle.plate_number}</span>
              <span className="badge badge-available" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                {selectedVehicle.vehicle_type}
              </span>
            </button>
          )}

          {user && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {user.email} &bull; <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{user.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        <button
          className={`btn ${activeTab === 'slots' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('slots')}
        >
          <Calendar size={16} />
          <span>Reserve Slot</span>
        </button>

        <button
          className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('bookings')}
        >
          <User size={16} />
          <span>My Reservations</span>
        </button>

        <button
          className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} />
          <span>Security Gate Console</span>
        </button>

        <button
          className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('admin')}
        >
          <BarChart2 size={16} />
          <span>Admin Analytics</span>
        </button>
      </nav>
    </header>
  );
};
