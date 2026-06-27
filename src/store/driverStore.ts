// store/driverStore.ts
import { create } from 'zustand';
import { saveSession, removeSession, getToken, getDriver } from '@/services/session';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface DriverStore {
  user: Driver | null;
  token: string | null;
  isOnline: boolean;
  activeShipment: any | null;
  setUser: (user: Driver) => void;
  setToken: (token: string) => void;
  setOnline: (status: boolean) => void;  // Make sure this is defined
  setActiveShipment: (shipment: any) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useDriverStore = create<DriverStore>((set) => ({
  user: null,
  token: null,
  isOnline: false,
  activeShipment: null,
  
  setUser: (user) => {
    console.log('📝 Store: setUser called', user);
    set({ user });
  },
  
  setToken: (token) => {
    console.log('🎫 Store: setToken called', token ? `Token (${token.substring(0, 20)}...)` : 'null');
    set({ token });
  },
  
  setOnline:          (online)   => set({ isOnline: online }),  // ← add this

  
  setActiveShipment: (shipment) => {
    console.log('📦 Store: setActiveShipment called', shipment);
    set({ activeShipment: shipment });
  },

  
  
  logout: async () => {
    console.log('🚪 Store: logout called');
    await removeSession();
    set({ user: null, token: null, isOnline: false, activeShipment: null });
  },
  
  initialize: async () => {
    console.log('🔄 Store: initialize started');
    try {
      const [token, driver] = await Promise.all([getToken(), getDriver()]);
      console.log('📦 Store: initialize results -', {
        hasToken: !!token,
        hasDriver: !!driver,
      });
      set({ token, user: driver });
    } catch (error) {
      console.error('❌ Store: initialize error', error);
    }
  },
}));