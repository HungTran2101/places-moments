"use client";

import { useError } from "@/components/ErrorProvider";
import { getOrCreateUUID } from "@/lib/uuid";
import thoughtBubbleImg from "@/public/assets/thought_bubble.webp";
import { ApiError, RUNTIME_ERROR_STATUS, type ErrorMessageKey } from "@/services/shared/errors";
import { createSubmission } from "@/services/submissions";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import { useSubmissionMapStore, type ScreenPoint } from "@/store/useSubmissionMapStore";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";
import { GlassButton } from "../ui/glass-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SubmissionAnimation from "./SubmissionAnimation";

interface SubmissionFormProps {
  onSuccess?: () => void;
}

type SubmissionStage = "map" | "identity" | "create" | "refresh" | "complete";

function submissionErrorKey(error: unknown, stage: SubmissionStage): ErrorMessageKey {
  if (stage === "map") return "mapUnavailable";
  if (stage === "identity") return "storage";
  if (stage === "refresh") return "refreshFailed";
  if (stage !== "create") return "unexpected";
  if (error instanceof ApiError) {
    if (error.status === 429) return "rateLimited";
    if (error.status === 400 || error.status === 422) return "invalidSubmission";
    if (error.status === RUNTIME_ERROR_STATUS.NETWORK) return "network";
  }
  return "submissionFailed";
}

export default function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  const t = useTranslations("submission");
  const [description, setDescription] = useState("");
  const [hasDescriptionError, setHasDescriptionError] = useState(false);
  const [isDescriptionFlashing, setIsDescriptionFlashing] = useState(false);
  const [flight, setFlight] = useState<{
    origin: ScreenPoint;
    getDestination: () => ScreenPoint;
    subscribeToResize: (listener: () => void) => () => void;
    onArrival: () => void;
  } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);
  const activeRunRef = useRef<{
    controller: AbortController;
    finish: (saved: boolean) => void;
    saved: boolean;
    resolveAnimation: () => void;
  } | null>(null);
  const { showError } = useError();
  const submissionMap = useSubmissionMapStore((state) => state.map);
  const isSubmitting = useSubmissionMapStore((state) => state.isSubmitting);
  const { lat, lng } = usePinStore();
  const isPlaced = usePinStore((state) => state.isPlaced);
  const isSubmitDisabled = isSubmitting || !isPlaced || !submissionMap;

  useEffect(() => usePinStore.subscribe((state) => {
    if (!state.isPlaced || !useSystemStore.getState().sidebarOpen
      || useSubmissionMapStore.getState().isSubmitting) return;

    // Focus ngay khi đặt hoặc di chuyển ghim, kể cả khi chọn lại cùng tọa độ.
    descriptionRef.current?.focus({ preventScroll: true });
  }), []);

  useEffect(() => () => {
    // Hủy request và mở lại bản đồ khi form bị tháo giữa lúc gửi.
    const run = activeRunRef.current;
    activeRunRef.current = null;
    if (!run) return;
    run.controller.abort();
    run.resolveAnimation();
    run.finish(run.saved);
    useSubmissionMapStore.getState().setIsSubmitting(false);
  }, []);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!isPlaced || useSubmissionMapStore.getState().isSubmitting) return;

    if (!description.trim()) {
      setHasDescriptionError(true);
      setIsDescriptionFlashing(false);
      descriptionRef.current?.focus();
      window.requestAnimationFrame(() => setIsDescriptionFlashing(true));
      return;
    }

    let stage: SubmissionStage = "map";
    let run: typeof activeRunRef.current = null;
    try {
      if (!submissionMap || !suffixRef.current) {
        showError(new Error("Map is not ready"), { messageKey: "mapUnavailable" });
        return;
      }
      const finish = submissionMap.beginSubmission();
      const controller = new AbortController();
      let resolveAnimation = () => { };
      const animationDone = new Promise<void>((resolve) => { resolveAnimation = resolve; });
      let refreshReady = false;
      run = { controller, finish, resolveAnimation, saved: false };
      const currentRun = run;
      activeRunRef.current = run;
      useSubmissionMapStore.getState().setIsSubmitting(true);
      const rect = suffixRef.current.getBoundingClientRect();
      setIsWaiting(false);
      setFlight({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        getDestination: submissionMap.getPinPosition,
        subscribeToResize: submissionMap.subscribeToResize,
        onArrival: () => {
          setIsWaiting(!refreshReady);
          resolveAnimation();
        },
      });

      stage = "identity";
      const author_uuid = getOrCreateUUID();
      const signal = controller.signal;
      // Hai API vẫn chạy trong lúc bubble bay; chỉ đưa dữ liệu mới lên bản đồ sau khi đến ghim.
      stage = "create";
      submissionMap.zoomToPin(signal);
      await createSubmission(
        { description: description.trim(), lat, lng, author_uuid },
        { reportGlobalError: false, signal },
      );
      currentRun.saved = true;
      signal.throwIfAborted();
      stage = "refresh";
      // Bài đã lưu thì xóa bản nháp, kể cả khi tải marker lỗi, tránh gửi trùng khi thử lại.
      setDescription("");
      const revealMarkers = await submissionMap.prepareMarkerRefresh(signal);
      refreshReady = true;
      await animationDone;
      signal.throwIfAborted();
      await revealMarkers();
      // Bỏ bubble đã đến nơi trước khi di chuyển bản đồ để ảnh không đứng lại giữa màn hình.
      setFlight(null);
      setIsWaiting(false);
      stage = "complete";
      onSuccess?.();
    } catch (error) {
      if (run?.controller.signal.aborted) return;
      showError(error, { messageKey: submissionErrorKey(error, stage) });
    } finally {
      if (run && activeRunRef.current === run) {
        activeRunRef.current = null;
        run.resolveAnimation();
        run.finish(run.saved);
        useSubmissionMapStore.getState().setIsSubmitting(false);
        setFlight(null);
        setIsWaiting(false);
        // Chỉ trả focus sau khi bubble bay, marker tải xong, zoom kết thúc và bản đồ đã mở khóa.
        if (stage === "complete") submissionMap?.focus();
      }
    }
  }

  return (
    <form className="SubmissionForm" onSubmit={handleSubmit} aria-busy={isSubmitting}>
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
          readOnly={isSubmitting}
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
                <span ref={suffixRef} className="SubmissionForm-suffix" style={{ visibility: isSubmitting ? "hidden" : "visible" }}>
                  <Image
                    src={thoughtBubbleImg}
                    alt=""
                    width={20}
                    height={20}
                  />
                </span>
              }
            >
              <div className="ml-2">
                {!isPlaced
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

      {flight && <SubmissionAnimation {...flight} waiting={isWaiting} />}
    </form>
  );
}
