import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/common/Header';
import { SlotDiscoveryView } from './components/parking/SlotDiscoveryView';
import { MyBookingsView } from './components/parking/MyBookingsView';
import { BookingPassModal } from './components/parking/BookingPassModal';
import { VehicleSelectorModal } from './components/parking/VehicleSelectorModal';
import { SecurityConsole } from './components/security/SecurityConsole';
import { AdminDashboard } from './components/admin/AdminDashboard';

export const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('slots');
  const [activeBookingPassId, setActiveBookingPassId] = useState<number | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVehicleModal={() => setIsVehicleModalOpen(true)}
      />

      {/* Main Content Body */}
      <main>
        {activeTab === 'slots' && (
          <SlotDiscoveryView
            onBookingSuccess={(bookingId) => {
              setActiveBookingPassId(bookingId);
            }}
            onOpenVehicleModal={() => setIsVehicleModalOpen(true)}
          />
        )}

        {activeTab === 'bookings' && (
          <MyBookingsView
            onOpenQRModal={(bookingId) => setActiveBookingPassId(bookingId)}
          />
        )}

        {activeTab === 'security' && (
          <SecurityConsole />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Generated QR Booking Pass Modal */}
      {activeBookingPassId && (
        <BookingPassModal
          bookingId={activeBookingPassId}
          onClose={() => setActiveBookingPassId(null)}
        />
      )}

      {/* Vehicle Registration & Selection Modal */}
      <VehicleSelectorModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
