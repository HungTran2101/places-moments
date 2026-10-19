import { create } from "zustand";

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface SubmissionMap {
  focus: () => void;
  getPinPosition: () => ScreenPoint;
  subscribeToResize: (listener: () => void) => () => void;
  prepareMarkerRefresh: (signal: AbortSignal) => Promise<() => Promise<void>>;
  beginSubmission: () => (saved: boolean) => void;
}

interface SubmissionMapState {
  map: SubmissionMap | null;
  isSubmitting: boolean;
  setMap: (map: SubmissionMap | null) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

// Chỉ chia sẻ cầu nối cần cho form; vòng đời MapLibre vẫn do MapView quản lý.
export const useSubmissionMapStore = create<SubmissionMapState>((set) => ({
  map: null,
  isSubmitting: false,
  setMap: (map) => set({ map }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
