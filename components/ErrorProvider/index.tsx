"use client";

import {
  APP_ERROR_EVENT,
  AppError,
  RUNTIME_ERROR_STATUS,
  toAppError,
} from "@/services/shared/errors";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface ErrorContextValue {
  activeError: AppError | null;
  isErrorOpen: boolean;
  showError: (error: unknown, overrides?: Partial<Omit<AppError, "timestamp">>) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [activeError, setActiveError] = useState<AppError | null>(null);

  // Dung khi muon day mot loi len top-level modal theo cach chu dong.
  const showError = (
    error: unknown,
    overrides: Partial<Omit<AppError, "timestamp">> = {}
  ) => {
    setActiveError(toAppError(error, overrides));
  };

  const clearError = () => {
    setActiveError(null);
  };

  useEffect(() => {
    // Bat cac runtime error khong duoc component con tu xu ly.
    const handleWindowError = (event: ErrorEvent) => {
      showError(event.error ?? event.message, {
        name: event.error?.name || "WindowError",
        status: RUNTIME_ERROR_STATUS.WINDOW,
        source: "runtime",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showError(event.reason, {
        name: "UnhandledPromiseRejection",
        status: RUNTIME_ERROR_STATUS.UNHANDLED_PROMISE,
        source: "runtime",
      });
    };

    const handleAppError = (event: Event) => {
      const customEvent = event as CustomEvent<AppError>;
      setActiveError(customEvent.detail);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener(APP_ERROR_EVENT, handleAppError);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener(APP_ERROR_EVENT, handleAppError);
    };
  }, []);

  const value = useMemo<ErrorContextValue>(
    () => ({
      activeError,
      isErrorOpen: activeError !== null,
      showError,
      clearError,
    }),
    [activeError]
  );

  return (
    <ErrorContext.Provider value={value}>
      {/* Placeholder nay danh dau vi tri de sau nay gan error modal top-level. */}
      {value.isErrorOpen ? <div data-error-modal-root="" aria-hidden="true" /> : null}
      {/* Loi render/root se do Next.js `error.tsx` va `global-error.tsx` xu ly. */}
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);

  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }

  return context;
}
