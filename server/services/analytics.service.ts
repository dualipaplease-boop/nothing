import db from '../db/database.ts';

export function getDashboardOverview() {
  const totalSlotsRow = db.prepare('SELECT COUNT(*) as count FROM parking_slots').get() as { count: number };
  const maintenanceRow = db.prepare("SELECT COUNT(*) as count FROM parking_slots WHERE status = 'SLOT_MAINTENANCE'").get() as { count: number };
  const activeSessionsRow = db.prepare("SELECT COUNT(*) as count FROM parking_sessions WHERE status = 'ACTIVE'").get() as { count: number };

  const nowIso = new Date().toISOString();
  const reservedNowRow = db.prepare(`
    SELECT COUNT(DISTINCT slot_id) as count
    FROM bookings
    WHERE status IN ('CONFIRMED', 'ACTIVE')
      AND start_time <= ?
      AND end_time > ?
  `).get(nowIso, nowIso) as { count: number };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayBookingsRow = db.prepare(`
    SELECT COUNT(*) as count FROM bookings WHERE created_at >= ?
  `).get(todayStart.toISOString()) as { count: number };

  const totalSlots = totalSlotsRow.count || 0;
  const occupiedCount = activeSessionsRow.count || 0;
  const reservedCount = reservedNowRow.count || 0;
  const maintenanceCount = maintenanceRow.count || 0;
  const availableCount = Math.max(0, totalSlots - occupiedCount - maintenanceCount);
  const occupancyPercentage = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;

  // Zone breakdown
  const zones = db.prepare(`
    SELECT l.id, l.name, l.code, COUNT(s.id) as total_zone_slots,
           SUM(CASE WHEN s.status = 'SLOT_OCCUPIED' THEN 1 ELSE 0 END) as occupied_slots,
           SUM(CASE WHEN s.status = 'SLOT_MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_slots
    FROM parking_locations l
    LEFT JOIN parking_slots s ON l.id = s.location_id
    GROUP BY l.id, l.name, l.code
  `).all() as any[];

  const zoneStats = zones.map((z) => ({
    id: z.id,
    name: z.name,
    code: z.code,
    totalSlots: z.total_zone_slots,
    occupiedSlots: z.occupied_slots,
    maintenanceSlots: z.maintenance_slots,
    availableSlots: Math.max(0, z.total_zone_slots - z.occupied_slots - z.maintenance_slots),
    utilizationRate: z.total_zone_slots > 0 ? Math.round((z.occupied_slots / z.total_zone_slots) * 100) : 0
  }));

  return {
    kpis: {
      totalSlots,
      availableCount,
      reservedCount,
      occupiedCount,
      maintenanceCount,
      activeSessionsCount: occupiedCount,
      todayBookingsCount: todayBookingsRow.count || 0,
      occupancyPercentage
    },
    zoneStats
  };
}

export function getPeakDemandInsights() {
  // Group historical bookings and sessions by hour (0 to 23)
  const hourlyData = db.prepare(`
    SELECT
      strftime('%H', start_time) as hour,
      COUNT(*) as count
    FROM bookings
    WHERE status IN ('CONFIRMED', 'ACTIVE', 'COMPLETED')
    GROUP BY hour
    ORDER BY hour ASC
  `).all() as { hour: string; count: number }[];

  // Fill all 24 hours
  const full24Hours = Array.from({ length: 24 }, (_, i) => {
    const hrStr = i.toString().padStart(2, '0');
    const found = hourlyData.find((d) => d.hour === hrStr);
    return {
      hour: `${hrStr}:00`,
      hourNum: i,
      bookingsCount: found ? found.count : 0
    };
  });

  // Find peak hour and off-peak hour
  let peakHourObj = full24Hours[0];
  let offPeakHourObj = full24Hours[0];

  full24Hours.forEach((item) => {
    if (item.bookingsCount > peakHourObj.bookingsCount) {
      peakHourObj = item;
    }
    if (item.hourNum >= 8 && item.hourNum <= 20 && item.bookingsCount <= offPeakHourObj.bookingsCount) {
      offPeakHourObj = item;
    }
  });

  return {
    hourlyTrend: full24Hours,
    peakDemandInsight: {
      busiestHour: peakHourObj.hour,
      peakBookingsCount: peakHourObj.bookingsCount,
      recommendedOffPeakHour: offPeakHourObj.hour,
      recommendationMessage: peakHourObj.bookingsCount > 0
        ? `Peak campus demand occurs around ${peakHourObj.hour} with ${peakHourObj.bookingsCount} reservations. Consider booking around ${offPeakHourObj.hour} for faster slot allocation.`
        : 'Demand is evenly distributed across campus hours.'
    }
  };
}

export function getRecentActivityLog(limit = 15) {
  return db.prepare(`
    SELECT 'BOOKING' as type, b.id, b.created_at, b.status, u.name as user_name, v.plate_number, s.slot_number, l.name as zone_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN parking_slots s ON b.slot_id = s.id
    JOIN parking_locations l ON s.location_id = l.id
    ORDER BY b.created_at DESC
    LIMIT ?
  `).all(limit);
}
