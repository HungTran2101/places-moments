"use client";

import { getOrCreateUUID } from "@/lib/uuid";
import { usePinStore } from "@/store/usePinStore";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { GlassButton } from "../ui/glass-button";

interface SubmissionFormProps {
  onSuccess?: () => void;
}

export default function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  const t = useTranslations("submission");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { lat, lng } = usePinStore();

  // We consider the marker "unplaced" if it's at the absolute default (or we could add a placed flag to the store)
  // For now, let's assume if lat/lng are exactly 20/0, they haven't placed it.
  // A better way is to update the store to have an `isPlaced` boolean.
  const isPlaced = usePinStore((state) => state.isPlaced);
  console.log({ isPlaced });

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!isPlaced) return;
    setStatus("loading");

    try {
      const author_uuid = getOrCreateUUID();
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, lat, lng, author_uuid }),
      });

      if (!res.ok) throw new Error(await res.text());

      setStatus("success");
      setTitle("");
      setDescription("");
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="SubmissionForm " onSubmit={handleSubmit}>
      <label className="SubmissionForm-label">
        {t("titleLabel")}
        <input
          className="SubmissionForm-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={120}
          required
        />
      </label>

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
      <GlassButton
        type="submit"
        disabled={status === "loading" || !isPlaced}
        primaryColor="purple"
      >
        {status === "loading"
          ? t("submitting")
          : !isPlaced
            ? "Click map to set location"
            : t("submit")}
      </GlassButton>

      {status === "success" && <p className="SubmissionForm-success">{t("success")}</p>}
      {status === "error" && <p className="SubmissionForm-error">{t("error")}</p>}
    </form>
  );
}
