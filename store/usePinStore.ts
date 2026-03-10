import { create } from 'zustand';

interface PinState {
  lat: number;
  lng: number;
  isPlaced: boolean;
  setPin: (lat: number, lng: number) => void;
  setIsPlaced: (isPlaced: boolean) => void;
}

export const usePinStore = create<PinState>((set) => ({
  lat: 20, // Initial latitude
  lng: 0,  // Initial longitude
  isPlaced: false,
  setPin: (lat, lng) => set({ lat, lng, isPlaced: true }),
  setIsPlaced: (isPlaced) => set({ isPlaced }),
}));
