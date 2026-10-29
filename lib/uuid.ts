const UUID_KEY = "pm_author_uuid";
export const AUTHOR_UUID_CHANGED_EVENT = "pm-author-uuid-changed";

/**
 * Returns the author UUID from LocalStorage.
 * Creates and persists a new UUID if none exists.
 * Must only be called client-side.
 */
export function getOrCreateUUID(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateUUID must be called client-side only");
  }

  const existing = localStorage.getItem(UUID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(UUID_KEY, id);
  window.dispatchEvent(new Event(AUTHOR_UUID_CHANGED_EVENT));
  return id;
}

/**
 * Returns the stored UUID without creating one.
 * Returns null if none is stored.
 */
export function getUUID(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(UUID_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ thì lịch sử hiển thị lời mời chia sẻ thay vì tạo UUID.
    return null;
  }
}
