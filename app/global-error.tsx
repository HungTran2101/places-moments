"use client";

import { GlobalErrorFallback } from "@/components/ErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body style={{
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
      >
        <GlobalErrorFallback error={error} onRetry={reset} />
      </body>
    </html>
  );
}
