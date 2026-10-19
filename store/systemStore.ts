import { create } from 'zustand';

interface SystemState {
  sidebarWidth: number;
  primaryColor: string;
  secondaryColor: string;
  mapReady: boolean;
  feature: 'moment' | 'message'
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 400,
  primaryColor: '124, 127, 178',
  secondaryColor: '225, 161, 255',
  mapReady: false,
  feature: 'moment',
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setMapReady: (ready: boolean) => set({ mapReady: ready }),
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
