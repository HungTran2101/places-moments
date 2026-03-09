"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getOrCreateUUID } from "@/lib/uuid";
import styles from "./SubmissionForm.module.scss";

interface SubmissionFormProps {
  lat: number;
  lng: number;
  onSuccess?: () => void;
}

export default function SubmissionForm({ lat, lng, onSuccess }: SubmissionFormProps) {
  const t = useTranslations("submission");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label}>
        {t("titleLabel")}
        <input
          className={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={120}
          required
        />
      </label>

      <label className={styles.label}>
        {t("descriptionLabel")}
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={600}
          rows={4}
          required
        />
      </label>

      <button
        className={styles.button}
        type="submit"
        disabled={status === "loading"}
      >
        {status === "loading" ? t("submitting") : t("submit")}
      </button>

      {status === "success" && <p className={styles.success}>{t("success")}</p>}
      {status === "error" && <p className={styles.error}>{t("error")}</p>}
    </form>
  );
}
