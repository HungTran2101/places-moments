"use client";

import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils";
import { getErrorMessageKey, type AppError } from "@/services/shared/errors";
import { ClockFading, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";

interface ErrorModalProps {
  open: boolean;
  error: AppError | null;
  onOpenChange: (open: boolean) => void;
}

export default function ErrorModal({ open, error, onOpenChange }: ErrorModalProps) {
  const t = useTranslations("errors");

  const isRateLimitError = error?.status === 429;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ErrorModal-overlay" />
        <Dialog.Content className="ErrorModal-content liquid-glass2">
          {isRateLimitError ? (
            <ClockFading className={cn("ErrorModal-icon", "ErrorModal-icon--rateLimited")} size={32} aria-hidden="true" />
          ) : (
            <TriangleAlert className="ErrorModal-icon" size={32} aria-hidden="true" />
          )}
          <Dialog.Title className="ErrorModal-title">{isRateLimitError ? t('rateLimitedTitle') : t("title")}</Dialog.Title>
          <Dialog.Description className="ErrorModal-description">
            {t(error ? getErrorMessageKey(error) : "unexpected")}
          </Dialog.Description>
          <Dialog.Close asChild>
            <GlassButton primaryColor="blue" type="button">{t("dismiss")}</GlassButton>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
