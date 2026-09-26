# SOURCE-TO-TARGET INTEGRATION MAP

This document records all external repositories inspected, cloned, and extracted/adapted for the **Smart Campus Parking System MVP**.

---

## 1. ParkEase (Primary Feature Donor)

- **Repository URL**: `https://github.com/bhartiaditya730-ux/parking-slot-booking-app`
- **Revision / Commit Hash**: `2432495086eafa45a84cacbc2d593ee44d8214c9`
- **License**: MIT License (`LICENSE` present in repository)

### Adapted Components / Implementation Paths

| Source File / Function | Target File in Base Project | Adaptation & Improvements |
|------------------------|-----------------------------|---------------------------|
| `services/backend/src/routes/booking.ts`<br>- `POST /` (Booking creation)<br>- Overlap check logic<br>- Transactional reservation | `server/services/booking.service.ts`<br>`server/routes/booking.routes.ts` | **Retained**: Time interval overlap validation `(start < existing.end AND end > existing.start)`, duration calculation, transaction boundary.<br>**Changed**: Replaced Prisma/Supabase with SQLite atomic transactions; changed slot status handling from static global reserved to time-based availability checking.<br>**Removed**: PII in booking response payload, Supabase specific timeouts. |
| `services/backend/src/utils/qrcode.ts`<br>- `generateQRCode`<br>- `generateQRCodeBuffer` | `server/utils/qrcode.ts` | **Retained**: PNG DataURL creation with `qrcode` package, styling options.<br>**Changed**: Replaced PII payload (`userId`, `slotNumber`, `startTime`) with an **opaque, cryptographically random credential hash (`TKT-xxxx-xxxx`)**. Never encode PII in QR. |
| `apps/admin/src/pages/SlotsPage.tsx`<br>- Status counts<br>- Filters & Grid rendering | `src/components/parking/SlotGrid.tsx`<br>`src/components/admin/AdminSlotManager.tsx` | **Retained**: Status card counts, zone/status filter chips, interactive grid visual representation.<br>**Changed**: Styled with modern CSS, glassmorphism, connected to SQLite API, dynamic time-window availability lookup. |
| `apps/admin/src/pages/DashboardPage.tsx`<br>`services/backend/src/routes/admin.ts` | `src/components/admin/AdminDashboard.tsx`<br>`server/routes/admin.routes.ts` | **Retained**: KPI metric cards (Available, Reserved, Occupied, Maintenance), recent activity table, backend aggregation query structure.<br>**Changed**: Real-time websocket update listener, responsive mobile/desktop design. |
| `apps/admin/src/pages/ReportsPage.tsx`<br>`services/backend/src/routes/report.ts` | `src/components/admin/AnalyticsReport.tsx`<br>`server/routes/analytics.routes.ts` | **Retained**: Recharts dashboard visualization (Area & Bar charts), utilization metrics.<br>**Changed**: Fixed utilization metric calculation (time-weighted occupancy instead of distinct slots ever booked), added peak-hour demand analytics. |

---

## 2. `@yudiel/react-qr-scanner` (Browser Camera QR Scanner)

- **Repository URL**: `https://github.com/yudielcurbelo/react-qr-scanner`
- **Revision / Commit Hash**: `8c7ef45964607859468ef6ba18b98d717445b7a8`
- **License**: MIT License (`LICENSE` present in repository)

### Adapted Components / Implementation Paths

| Source File / Function | Target File in Base Project | Adaptation & Improvements |
|------------------------|-----------------------------|---------------------------|
| `@yudiel/react-qr-scanner`<br>- `<Scanner>` component<br>- `onScan` callback<br>- `onError` handling | `src/components/security/QRScannerModal.tsx` | **Retained**: Maintained React package dependency, rear camera constraint (`facingMode: 'environment'`), QR format filter, camera lifecycle.<br>**Changed**: Bound `onScan` raw value directly to backend ticket validation endpoint, added auto-pause during in-flight validation to prevent duplicate scans.<br>**Added**: Comprehensive camera permission denied, missing camera, insecure context (HTTP) user error callouts & manual token input fallback. |

---

## 3. GDSC-ESTIN Check-in System (Scan Callback Pattern)

- **Repository URL**: `https://github.com/GDSC-ESTIN/checkin-system`
- **Revision / Commit Hash**: `839831c9be7d2409e825ca14d27a3c285bde3764`
- **License**: MIT License (`LICENSE` present in repository)

### Adapted Components / Implementation Paths

| Source File / Function | Target File in Base Project | Adaptation & Improvements |
|------------------------|-----------------------------|---------------------------|
| `scanner/src/App.js`<br>- `handleScann(e)` callback pattern | `src/components/security/SecurityConsole.tsx` | **Retained**: Scan-to-request state machine pattern (Scan → Pause → Loading Spinner → Result Banner → Resume/Reset).<br>**Changed**: Discarded hardcoded localhost:5001 endpoint and CSV backend; routed request through JWT-authenticated API client to SQLite backend. |

---

## 4. Gatehouse (Session Service Reference)

- **Repository URL**: `https://github.com/SuvidhJ/gatehouse`
- **Revision / Commit Hash**: `9e6004ef1186693b3d4a0c560a33028826d4f6e9`
- **License**: Technical Reference / ISC backend declaration (`mall_parking_backend/package.json`)

### Adapted Components / Implementation Paths

| Source File / Function | Target File in Base Project | Adaptation & Improvements |
|------------------------|-----------------------------|---------------------------|
| `mall_parking_backend/src/services/session.service.ts`<br>- `startSession`<br>- `endSession` | `server/services/session.service.ts` | **Retained**: Atomic check-in transition (verify reservation → mark active session → set slot occupied) and check-out transition (close session → release slot).<br>**Changed**: Replaced Postgres raw SQL queries with SQLite atomic transaction primitives. Prevented duplicate active sessions per vehicle/reservation. |

---

## 5. DayannaAndrea Campus Parking (Reference Only)

- **Repository URL**: `https://github.com/DayannaAndrea/campus-parking`
- **Revision / Commit Hash**: `b271ccb955700e67aaa0b61ea0afeef9c19e9306`
- **License**: Unlicensed (Reference Only)

### Adaptation Details

- Used strictly as a conceptual checklist for campus parking workflows (e.g. grace period rules for early/late entry, campus zone definitions).
- **NO source code was copied or directly adapted from this repository.**

---
