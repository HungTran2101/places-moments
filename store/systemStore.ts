import { create } from 'zustand';

interface SystemState {
  sidebarWidth: number;
  primaryColor: string;
  secondaryColor: string;
  mapReady: boolean;
  mapState: '2d' | '3d';
  feature: 'moment' | 'message'
  setMapReady: (ready: boolean) => void;
  setMapState: (mapState: '2d' | '3d') => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 300,
  primaryColor: '124, 127, 178',
  secondaryColor: '225, 161, 255',
  mapState: '2d',
  mapReady: false,
  feature: 'moment',
  setMapReady: (ready: boolean) => set({ mapReady: ready }),
  setMapState: (mapState: '2d' | '3d') => set({ mapState }),
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
