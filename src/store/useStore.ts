import { create } from 'zustand';
import { UserProfile } from '../types';

interface AppState {
  activeUser: UserProfile | null;
  lastSalesRecordId: string | null;
  setActiveUser: (user: UserProfile | null) => void;
  setLastSalesRecordId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  activeUser: null,
  lastSalesRecordId: null,
  setActiveUser: (user) => set({ activeUser: user }),
  setLastSalesRecordId: (id) => set({ lastSalesRecordId: id }),
}));