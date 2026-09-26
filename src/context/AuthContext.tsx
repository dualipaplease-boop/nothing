import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'STUDENT' | 'STAFF' | 'SECURITY' | 'ADMIN';
  department?: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  plate_number: string;
  vehicle_type: 'CAR' | 'BIKE' | 'EV';
  model?: string;
  is_default: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  login: (email: string, pass: string) => Promise<void>;
  loginAsRole: (role: 'STUDENT' | 'STAFF' | 'SECURITY' | 'ADMIN') => Promise<void>;
  logout: () => void;
  setSelectedVehicle: (vehicle: Vehicle) => void;
  refreshVehicles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setVehicles(data.vehicles || []);
        if (data.vehicles && data.vehicles.length > 0) {
          setSelectedVehicle(data.vehicles[0]);
        }
      } else {
        logout();
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      // Default to student login for hackathon preview
      loginAsRole('STUDENT');
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchProfile(data.token);
  };

  const loginAsRole = async (role: 'STUDENT' | 'STAFF' | 'SECURITY' | 'ADMIN') => {
    const roleEmails: Record<string, string> = {
      STUDENT: 'student@campus.edu',
      STAFF: 'staff@campus.edu',
      SECURITY: 'security@campus.edu',
      ADMIN: 'admin@campus.edu'
    };
    const email = roleEmails[role];
    await login(email, 'password123');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setVehicles([]);
    setSelectedVehicle(null);
  };

  const refreshVehicles = async () => {
    if (!token) return;
    const res = await fetch('/api/vehicles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setVehicles(data.vehicles || []);
      if (data.vehicles && data.vehicles.length > 0 && !selectedVehicle) {
        setSelectedVehicle(data.vehicles[0]);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        vehicles,
        selectedVehicle,
        login,
        loginAsRole,
        logout,
        setSelectedVehicle,
        refreshVehicles
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
