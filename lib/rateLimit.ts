import { NextRequest, NextResponse } from "next/server";

const store = new Map<string, number[]>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Simple in-memory IP-based rate limiter for API routes.
 * Not suitable for multi-instance deployments — replace with Redis for production.
 */
export function rateLimit(
  request: NextRequest,
  { maxRequests = 5, windowMs = 60_000 }: RateLimitOptions = {
    maxRequests: 5,
    windowMs: 60_000,
  }
): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const now = Date.now();
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  timestamps.push(now);
  store.set(ip, timestamps);
  return null; // allowed
}
