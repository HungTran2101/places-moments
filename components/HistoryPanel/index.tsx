"use client";

import type { Submission } from "@/services/submissions";
import { useTranslations } from "next-intl";

interface HistoryPanelProps {
  items?: Submission[];
  loading?: boolean;
}

export default function HistoryPanel({ items = [], loading = false }: HistoryPanelProps) {
  const t = useTranslations("history");

  return (
    <aside className="HistoryPanel">
      <h2 className="HistoryPanel-heading">{t("title")}</h2>

      {loading && <p className="HistoryPanel-muted">…</p>}

      {!loading && items.length === 0 && (
        <p className="HistoryPanel-muted">{t("empty")}</p>
      )}

      <ul className="HistoryPanel-list">
        {items.map((item) => (
          <li key={item.id} className="HistoryPanel-item">
            <p className="HistoryPanel-itemTitle">{item.description}</p>
            <p className="HistoryPanel-itemWeather">{item.weather_summary}</p>
            <p className="HistoryPanel-itemCoords">
              {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
