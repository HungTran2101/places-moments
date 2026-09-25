"use client";

import { getOrCreateUUID } from "@/lib/uuid";
import { createSubmission } from "@/services/submissions";
import { usePinStore } from "@/store/usePinStore";
import { useTranslations } from "next-intl";
import React, { useRef, useState } from "react";
import { GlassButton } from "../ui/glass-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import thoughtBubbleImg from '@/public/assets/thought_bubble.png'
import Image from "next/image";

interface SubmissionFormProps {
  onSuccess?: () => void;
}

export default function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  const t = useTranslations("submission");
  const [description, setDescription] = useState("");
  const [hasDescriptionError, setHasDescriptionError] = useState(false);
  const [isDescriptionFlashing, setIsDescriptionFlashing] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const { lat, lng } = usePinStore();
  const isPlaced = usePinStore((state) => state.isPlaced);
  const isSubmitDisabled = status === "loading" || !isPlaced;

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!isPlaced) return;

    if (!description.trim()) {
      setHasDescriptionError(true);
      setIsDescriptionFlashing(false);
      descriptionRef.current?.focus();
      window.requestAnimationFrame(() => setIsDescriptionFlashing(true));
      return;
    }

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
          ref={descriptionRef}
          className={`SubmissionForm-textarea${isDescriptionFlashing ? " SubmissionForm-textarea--flash-error" : ""}`}
          value={description}
          onChange={(e) => {
            const nextDescription = e.target.value;
            setDescription(nextDescription);
            if (nextDescription.trim()) setHasDescriptionError(false);
          }}
          onAnimationEnd={() => setIsDescriptionFlashing(false)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={600}
          rows={4}
          aria-invalid={hasDescriptionError}
          aria-describedby={hasDescriptionError ? "description-error" : undefined}
        />
        {hasDescriptionError && (
          <div id="description-error" className="SubmissionForm-validation-error" role="alert">
            {t("descriptionRequired")}
          </div>
        )}
      </label>
      <Tooltip
        open={!isPlaced ? isTooltipOpen : false}
        onOpenChange={setIsTooltipOpen}
      >
        <TooltipTrigger asChild>
          <div className="w-full">
            <GlassButton
              type="submit"
              disabled={isSubmitDisabled}
              primaryColor="purple"
              className="w-full"
              suffix={
                <Image
                  src={thoughtBubbleImg}
                  alt=""
                  width={20}
                  height={20}
                />
              }
            >
              <div className="ml-2">
                {status === "loading"
                  ? t("submitting")
                  : !isPlaced
                    ? t("clickMapToSubmit")
                    : t("submit")}
              </div>
            </GlassButton>
          </div>
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
