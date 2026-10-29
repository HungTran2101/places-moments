"use client";

import { AUTHOR_UUID_CHANGED_EVENT, getUUID } from "@/lib/uuid";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  // Theo dõi cả tab khác và lần đầu lưu UUID trong form ngay trên tab hiện tại.
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTHOR_UUID_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTHOR_UUID_CHANGED_EVENT, onChange);
  };
}

export function useAuthorUUID() {
  return useSyncExternalStore(subscribe, getUUID, () => null);
}
