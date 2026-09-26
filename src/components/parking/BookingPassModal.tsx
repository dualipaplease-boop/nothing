import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QrCode, X, Printer, ShieldCheck, Copy, Check } from 'lucide-react';

interface Props {
  bookingId: number;
  onClose: () => void;
}

export const BookingPassModal: React.FC<Props> = ({ bookingId, onClose }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passData, setPassData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/qr`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setPassData(data);
        setLoading(false);
      })
      .catch((err) => console.error('Failed to fetch QR pass', err));
  }, [bookingId, token]);

  const handleCopyToken = () => {
    if (passData?.ticketToken) {
      navigator.clipboard.writeText(passData.ticketToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={20} style={{ color: 'var(--accent-primary)' }} /> Campus Parking QR Pass
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem' }}>Generating secure QR pass...</div>
        ) : passData ? (
          <div>
            {/* QR Code Container */}
            <div style={{
              background: '#ffffff', padding: '1rem', borderRadius: '12px',
              display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              marginBottom: '1rem'
            }}>
              <img src={passData.qrDataURL} alt="Parking Pass QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
            </div>

            {/* Privacy notice */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} style={{ color: 'var(--status-available)' }} />
              <span>Opaque Credential Payload &bull; Zero PII encoded inside QR</span>
            </div>

            {/* Opaque Token */}
            <div style={{
              background: 'var(--bg-primary)', padding: '0.65rem 0.85rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1.25rem', border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-secondary)' }}>
                {passData.ticketToken}
              </span>
              <button onClick={handleCopyToken} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {copied ? <Check size={16} style={{ color: 'var(--status-available)' }} /> : <Copy size={16} />}
              </button>
            </div>

            {/* Pass Metadata Outside QR */}
            <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Zone & Bay:</span>
                <span style={{ fontWeight: 700 }}>{passData.details.zoneName} &bull; Slot {passData.details.slotNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Vehicle Plate:</span>
                <span style={{ fontWeight: 700 }}>{passData.details.plateNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Valid From:</span>
                <span>{new Date(passData.details.startTime).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Valid Until:</span>
                <span>{new Date(passData.details.endTime).toLocaleString()}</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
              <Printer size={16} /> Print / Save Pass
            </button>
          </div>
        ) : (
          <div style={{ color: 'var(--status-error)' }}>Failed to load QR pass.</div>
        )}
      </div>
    </div>
  );
};
