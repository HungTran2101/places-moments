import { create } from 'zustand';

interface SystemState {
  sidebarWidth: number;
  primaryColor: string;
  secondaryColor: string;
  mapState: '2d' | '3d';
  feature: 'moment' | 'message'
  setMapState: (mapState: '2d' | '3d') => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 300,
  primaryColor: '124, 127, 178',
  secondaryColor: '225, 161, 255',
  mapState: '2d',
  setMapState: (mapState: '2d' | '3d') => set({ mapState }),
  feature: 'moment',
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
