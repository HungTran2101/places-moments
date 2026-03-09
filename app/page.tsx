"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SubmissionForm from "@/components/submission/SubmissionForm";
import HistoryPanel from "@/components/history/HistoryPanel";
import styles from "./page.module.scss";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
});

export default function HomePage() {
  const [pin, setPin] = useState({ lat: 20, lng: 0 });
  const [showHistory, setShowHistory] = useState(false);

  return (
    <main className={styles.main}>
      {/* Map — fills the viewport */}
      <div className={styles.mapArea}>
        <MapView onPinMoved={(lat, lng) => setPin({ lat, lng })} />
      </div>

      {/* Submission sidebar */}
      <aside className={styles.sidebar}>
        <SubmissionForm
          lat={pin.lat}
          lng={pin.lng}
          onSuccess={() => setShowHistory(false)}
        />

        <button
          className={styles.historyToggle}
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? "← Back" : "My moments"}
        </button>

        {showHistory && <HistoryPanel />}
      </aside>
    </main>
  );
}
