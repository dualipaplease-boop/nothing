import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2, Zap, Car, Shield, AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [slotsList, setSlotsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingSlotId, setUpdatingSlotId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, analRes, slotsRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/parking/slots')
      ]);

      const dashData = await dashRes.json();
      const analData = await analRes.json();
      const slotsData = await slotsRes.json();

      setOverview(dashData);
      setAnalytics(analData);
      setSlotsList(slotsData.slots || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Handle slot maintenance status toggle
  const handleToggleMaintenance = async (slotId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'SLOT_MAINTENANCE' ? 'SLOT_AVAILABLE' : 'SLOT_MAINTENANCE';
    setUpdatingSlotId(slotId);

    try {
      const res = await fetch(`/api/admin/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update slot status', err);
    } finally {
      setUpdatingSlotId(null);
    }
  };

  if (loading) {
    return <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>Loading Admin Dashboard Analytics...</div>;
  }

  const kpis = overview?.kpis || {};
  const zoneStats = overview?.zoneStats || [];
  const peakInsight = analytics?.peakDemandInsight || {};
  const hourlyTrend = analytics?.hourlyTrend || [];

  return (
    <div>
      {/* Title */}
      <div className="glass-card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={22} style={{ color: 'var(--accent-primary)' }} /> Campus Administrative Dashboard & Occupancy Analytics
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Real-time KPI metrics, time-weighted zone utilization, peak demand insights, and slot maintenance controls.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={fetchDashboardData} style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL CAPACITY</div>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem' }}>
            {kpis.totalSlots} Slots
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Across 4 Campus Zones</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-available)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AVAILABLE NOW</div>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-available)', marginTop: '0.25rem' }}>
            {kpis.availableCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ready for reservation</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-occupied)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE SESSIONS</div>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-occupied)', marginTop: '0.25rem' }}>
            {kpis.activeSessionsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Parked on campus right now</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-reserved)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TODAY'S BOOKINGS</div>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-reserved)', marginTop: '0.25rem' }}>
            {kpis.todayBookingsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total reservations created today</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-secondary)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OCCUPANCY RATE</div>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-secondary)', marginTop: '0.25rem' }}>
            {kpis.occupancyPercentage}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Live campus occupancy</div>
        </div>
      </div>

      {/* Peak Demand Smart Feature & Recharts Visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Peak Demand Insight Banner & Chart */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Hourly Demand & Peak Arrival Analytics
          </h3>
          
          <div style={{
            background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>
              &starf; SMART INSIGHT: Peak Arrival at {peakInsight.busiestHour || '09:00'}
            </div>
            <p style={{ color: 'var(--text-primary)' }}>{peakInsight.recommendationMessage}</p>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrend.filter((h: any) => h.hourNum >= 6 && h.hourNum <= 22)}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
                <Bar dataKey="bookingsCount" radius={[4, 4, 0, 0]}>
                  {hourlyTrend.filter((h: any) => h.hourNum >= 6 && h.hourNum <= 22).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hour === peakInsight.busiestHour ? '#8b5cf6' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Utilization Breakdown */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Zone Capacity & Utilization Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {zoneStats.map((z: any) => (
              <div key={z.id} style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{z.name}</span>
                  <span className="badge badge-occupied" style={{ fontSize: '0.7rem' }}>{z.utilizationRate}% Utilized</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>{z.occupiedSlots} Occupied / {z.availableSlots} Available</span>
                  <span>Total: {z.totalSlots} Bays</span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${z.utilizationRate}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '3px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Interactive Slot Management Table */}
      <div className="glass-card">
        <h3 style={{ fontFamily: 'Outfit', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wrench size={20} style={{ color: 'var(--status-reserved)' }} /> Admin Slot Maintenance & Control Console
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>SLOT BAY</th>
                <th style={{ padding: '0.75rem' }}>ZONE</th>
                <th style={{ padding: '0.75rem' }}>FLOOR</th>
                <th style={{ padding: '0.75rem' }}>VEHICLE TYPE</th>
                <th style={{ padding: '0.75rem' }}>CURRENT STATUS</th>
                <th style={{ padding: '0.75rem' }}>MAINTENANCE ACTION</th>
              </tr>
            </thead>
            <tbody>
              {slotsList.map((slot) => (
                <tr key={slot.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>{slot.slot_number}</td>
                  <td style={{ padding: '0.75rem' }}>{slot.zone_name}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Floor {slot.floor}</td>
                  <td style={{ padding: '0.75rem' }}>{slot.allowed_vehicle_type}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge badge-${slot.status === 'SLOT_AVAILABLE' ? 'available' : slot.status === 'SLOT_OCCUPIED' ? 'occupied' : slot.status === 'SLOT_RESERVED' ? 'reserved' : 'maintenance'}`}>
                      {slot.status.replace('SLOT_', '')}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      className={`btn ${slot.status === 'SLOT_MAINTENANCE' ? 'btn-success' : 'btn-danger'}`}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => handleToggleMaintenance(slot.id, slot.status)}
                      disabled={updatingSlotId === slot.id}
                    >
                      {updatingSlotId === slot.id
                        ? 'Updating...'
                        : slot.status === 'SLOT_MAINTENANCE'
                        ? 'Enable Slot'
                        : 'Set Maintenance'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
