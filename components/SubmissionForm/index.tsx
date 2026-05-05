"use client";

import { getOrCreateUUID } from "@/lib/uuid";
import { createSubmission } from "@/services/submissions";
import { usePinStore } from "@/store/usePinStore";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { GlassButton } from "../ui/glass-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface SubmissionFormProps {
  onSuccess?: () => void;
}

export default function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  const t = useTranslations("submission");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const { lat, lng } = usePinStore();

  // We consider the marker "unplaced" if it's at the absolute default (or we could add a placed flag to the store)
  // For now, let's assume if lat/lng are exactly 20/0, they haven't placed it.
  // A better way is to update the store to have an `isPlaced` boolean.
  const isPlaced = usePinStore((state) => state.isPlaced);
  const isSubmitDisabled = status === "loading" || !isPlaced;

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!isPlaced) return;
    setStatus("loading");

    try {
      const author_uuid = getOrCreateUUID();
      // Form nay tu hien thi loi cuc bo, nen tat global error modal.
      await createSubmission(
        { description, lat, lng, author_uuid },
        { reportGlobalError: false }
      );

      setStatus("success");
      setDescription("");
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="SubmissionForm " onSubmit={handleSubmit}>
      <label className="SubmissionForm-label">
        {t("descriptionLabel")}
        <textarea
          className="SubmissionForm-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={600}
          rows={4}
          required
        />
      </label>
      <Tooltip
        open={isSubmitDisabled ? isTooltipOpen : false}
        onOpenChange={setIsTooltipOpen}
      >
        <TooltipTrigger asChild>
          <span className="w-full">
            <GlassButton
              type="submit"
              disabled={isSubmitDisabled}
              primaryColor="purple"
              className="w-full"
            >
              {status === "loading"
                ? t("submitting")
                : !isPlaced
                  ? t("clickMapToSubmit")
                  : t("submit")}
            </GlassButton>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("clickMapToSubmitTooltip")}</p>
        </TooltipContent>
      </Tooltip>

      {status === "success" && <p className="SubmissionForm-success">{t("success")}</p>}
      {status === "error" && <p className="SubmissionForm-error">{t("error")}</p>}
    </form>
  );
}
