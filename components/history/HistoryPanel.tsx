"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getUUID } from "@/lib/uuid";
import styles from "./HistoryPanel.module.scss";

interface Submission {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  weather_summary: string | null;
  created_at: string;
  updated_at: string;
}

export default function HistoryPanel() {
  const t = useTranslations("history");
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uuid = getUUID();
    if (!uuid) {
      setLoading(false);
      return;
    }

    // Author fetches all submissions and filters by own uuid client-side.
    // In a real app, add a GET /api/submissions?author=<uuid> endpoint.
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((all: Submission[]) => {
        // This stub shows all — replace with private endpoint in Phase 2
        setItems(all);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className={styles.panel}>
      <h2 className={styles.heading}>{t("title")}</h2>

      {loading && <p className={styles.muted}>…</p>}

      {!loading && items.length === 0 && (
        <p className={styles.muted}>{t("empty")}</p>
      )}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemWeather}>{item.weather_summary}</p>
            <p className={styles.itemCoords}>
              {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
