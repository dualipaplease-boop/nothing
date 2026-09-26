import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '../../context/AuthContext';
import { Shield, Camera, CameraOff, CheckCircle2, AlertTriangle, LogIn, LogOut, Search, Clock, Car } from 'lucide-react';

export const SecurityConsole: React.FC = () => {
  const { token } = useAuth();
  const [cameraOn, setCameraOn] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Check HTTP insecure context
  const isInsecureContext = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch('/api/security/active-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSessions(data.activeSessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch active sessions', err);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, [token]);

  // Handle ticket validation API request
  const validateToken = async (ticketToken: string) => {
    if (!ticketToken.trim()) return;
    setValidating(true);
    setActionMessage(null);
    setIsScanningPaused(true);

    try {
      const res = await fetch('/api/security/validate-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticketToken: ticketToken.trim() })
      });

      const data = await res.json();
      setValidationResult(data);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: 'Network or server error validating ticket.'
      });
    } finally {
      setValidating(false);
    }
  };

  // Handle QR scan detection
  const handleScan = (detectedCodes: any[]) => {
    if (isScanningPaused || validating) return;
    if (detectedCodes && detectedCodes.length > 0) {
      const rawValue = detectedCodes[0].rawValue;
      if (rawValue) {
        let tokenStr = rawValue;
        try {
          const parsed = JSON.parse(rawValue);
          if (parsed.ticket) tokenStr = parsed.ticket;
        } catch (e) {
          // Plain token string
        }
        setManualToken(tokenStr);
        validateToken(tokenStr);
      }
    }
  };

  const handleCheckIn = async () => {
    if (!validationResult?.booking?.ticket_token) return;
    try {
      const res = await fetch('/api/security/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticketToken: validationResult.booking.ticket_token })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed.');

      setActionMessage({ text: data.message, type: 'success' });
      setValidationResult(null);
      setManualToken('');
      fetchActiveSessions();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  const handleCheckOut = async (ticketTokenToUse?: string) => {
    const ticket = ticketTokenToUse || validationResult?.booking?.ticket_token;
    if (!ticket) return;

    try {
      const res = await fetch('/api/security/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticketToken: ticket })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-out failed.');

      setActionMessage({ text: data.message, type: 'success' });
      setValidationResult(null);
      setManualToken('');
      fetchActiveSessions();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div>
      {/* Title */}
      <div className="glass-card mb-6">
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={22} style={{ color: 'var(--accent-primary)' }} /> Campus Security Gate Console & QR Validator
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Scan student/staff QR passes, validate arrival grace windows, process check-ins, and record check-outs.
        </p>

        {isInsecureContext && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.75rem', fontSize: '0.8rem', color: '#fcd34d' }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '0.35rem' }} />
            Camera access requires HTTPS or localhost. If camera fails, use the Manual Ticket Code fallback input below.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Column: Scanner & Manual Input */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 600 }}>Camera QR Scanner</h3>
            <button
              className={`btn ${cameraOn ? 'btn-danger' : 'btn-primary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              onClick={() => {
                setCameraOn(!cameraOn);
                setIsScanningPaused(false);
                setCameraError(null);
              }}
            >
              {cameraOn ? <><CameraOff size={15} /> Close Camera</> : <><Camera size={15} /> Open Scanner</>}
            </button>
          </div>

          {/* Scanner Area */}
          <div style={{
            background: 'var(--bg-primary)', borderRadius: '12px', minHeight: '240px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            border: '1px solid var(--border-color)', marginBottom: '1rem', position: 'relative'
          }}>
            {cameraOn ? (
              <div style={{ width: '100%', height: '240px' }}>
                <Scanner
                  onScan={handleScan}
                  onError={(err: any) => {
                    console.error('Camera Scanner Error:', err);
                    setCameraError('Camera access denied or device has no available video input.');
                  }}
                  constraints={{ facingMode: 'environment' }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Camera size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Click "Open Scanner" to activate camera scanning.</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem' }}>
              {cameraError}
            </div>
          )}

          {/* Manual Token Entry Fallback */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              MANUAL TICKET CODE ENTRY
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="e.g. TKT-9A8B-7C6D-E5F4"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                style={{
                  flex: 1, padding: '0.65rem 0.85rem', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff',
                  fontFamily: 'monospace', fontSize: '0.9rem'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => validateToken(manualToken)}
                disabled={validating || !manualToken.trim()}
              >
                <Search size={16} /> Validate
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Validation Result Banner */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Ticket Verification Status
          </h3>

          {actionMessage && (
            <div style={{
              background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: actionMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
              padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem'
            }}>
              {actionMessage.text}
            </div>
          )}

          {validating ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Validating ticket credentials with database...
            </div>
          ) : validationResult ? (
            <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              
              {/* Validation Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {validationResult.valid ? (
                  <CheckCircle2 size={24} style={{ color: 'var(--status-available)' }} />
                ) : (
                  <AlertTriangle size={24} style={{ color: 'var(--status-error)' }} />
                )}
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: validationResult.valid ? 'var(--status-available)' : 'var(--status-error)' }}>
                  {validationResult.valid ? 'VALID TICKET CREDENTIAL' : 'REJECTED / INVALID'}
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {validationResult.message}
              </p>

              {validationResult.booking && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>User:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{validationResult.booking.user_name} ({validationResult.booking.user_email})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vehicle Plate:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{validationResult.booking.plate_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Assigned Bay:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>Slot {validationResult.booking.slot_number} ({validationResult.booking.zone_name})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Reserved Window:</span>
                    <span>{new Date(validationResult.booking.start_time).toLocaleTimeString()} &ndash; {new Date(validationResult.booking.end_time).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {validationResult.valid && validationResult.actionable === 'CHECK_IN' && (
                <button className="btn btn-success" style={{ width: '100%', padding: '0.75rem' }} onClick={handleCheckIn}>
                  <LogIn size={18} /> CONFIRM SECURITY CHECK-IN
                </button>
              )}

              {validationResult.valid && validationResult.actionable === 'CHECK_OUT' && (
                <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => handleCheckOut()}>
                  <LogOut size={18} /> CONFIRM SECURITY CHECK-OUT
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              Scan a QR code or enter a ticket token to perform gate verification.
            </div>
          )}
        </div>
      </div>

      {/* Active Campus Parking Sessions Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={20} style={{ color: 'var(--status-occupied)' }} /> Active On-Campus Vehicles ({activeSessions.length})
          </h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={fetchActiveSessions}>
            Refresh Table
          </button>
        </div>

        {activeSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No active vehicles currently checked in on campus.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>VEHICLE PLATE</th>
                  <th style={{ padding: '0.75rem' }}>DRIVER</th>
                  <th style={{ padding: '0.75rem' }}>SLOT / ZONE</th>
                  <th style={{ padding: '0.75rem' }}>CHECKED IN AT</th>
                  <th style={{ padding: '0.75rem' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--status-occupied)' }}>
                      {s.plate_number} ({s.vehicle_type})
                    </td>
                    <td style={{ padding: '0.75rem' }}>{s.user_name}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>Slot {s.slot_number} &bull; {s.zone_name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(s.checked_in_at).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => handleCheckOut(s.ticket_token)}
                      >
                        <LogOut size={13} /> Check-out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
