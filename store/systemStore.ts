import { create } from 'zustand';

interface SystemState {
  sidebarWidth: number;
  primaryColor: string;
  secondaryColor: string;
  mapReady: boolean;
  mapState: '2d' | '3d';
  feature: 'moment' | 'message'
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setMapState: (mapState: '2d' | '3d') => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 400,
  primaryColor: '124, 127, 178',
  secondaryColor: '225, 161, 255',
  mapState: '2d',
  mapReady: false,
  feature: 'moment',
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setMapReady: (ready: boolean) => set({ mapReady: ready }),
  setMapState: (mapState: '2d' | '3d') => set({ mapState }),
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
