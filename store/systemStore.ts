import { create } from 'zustand';

interface SystemState {
  sidebarWidth: number;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 300
}));
