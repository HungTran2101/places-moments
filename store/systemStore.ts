import { create } from 'zustand';
import type { MapTimeMode } from '@/components/MapView/timeStyle';

const MAP_TIME_MODE_KEY = 'pm_map_time_mode';

interface SystemState {
  sidebarWidth: number;
  primaryColor: string;
  secondaryColor: string;
  mapReady: boolean;
  mapTimeMode: MapTimeMode;
  feature: 'moment' | 'message'
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setMapTimeMode: (mode: MapTimeMode) => void;
  restoreMapTimeMode: () => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 400,
  primaryColor: '124, 127, 178',
  secondaryColor: '225, 161, 255',
  mapReady: false,
  mapTimeMode: 'auto',
  feature: 'moment',
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setMapReady: (ready: boolean) => set({ mapReady: ready }),
  setMapTimeMode: (mapTimeMode) => {
    set({ mapTimeMode });
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MAP_TIME_MODE_KEY, mapTimeMode);
    } catch {
      // Nếu trình duyệt chặn lưu trữ, vẫn giữ lựa chọn trong phiên hiện tại.
    }
  },
  restoreMapTimeMode: () => {
    if (typeof window === 'undefined') return;
    try {
      const savedMode = window.localStorage.getItem(MAP_TIME_MODE_KEY);
      if (savedMode === 'auto' || savedMode === 'daytime' || savedMode === 'evening' || savedMode === 'nighttime') {
        set({ mapTimeMode: savedMode });
      }
    } catch {
      // Không đọc được lựa chọn đã lưu thì giữ mặc định Auto khi mở trang.
    }
  },
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
