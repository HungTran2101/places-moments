import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Nhận "r, g, b" hoặc "rgb(r, g, b)"; trả undefined nếu màu không hợp lệ để bên gọi dùng màu mặc định.
export function rgbToHex(rgb: string): string | undefined {
  const value = rgb.trim()
  const channels = (value.match(/^rgb\((.*)\)$/i)?.[1] ?? value)
    .split(",")
    .map((channel) => channel.trim())

  if (channels.length !== 3 || channels.some((channel) => !/^\d{1,3}$/.test(channel) || Number(channel) > 255)) {
    return undefined
  }

  return `#${channels.map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`
}
