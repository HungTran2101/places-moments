"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SubmissionForm from "@/components/SubmissionForm";
import HistoryPanel from "@/components/HistoryPanel";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

export default function HomePage() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <main className="main">
      {/* Submission sidebar */}
      <aside className="sidebar">
        <SubmissionForm
          onSuccess={() => setShowHistory(false)}
        />

        <button
          className="historyToggle"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? "← Back" : "My moments"}
        </button>

        {showHistory && <HistoryPanel />}
      </aside>
      {/* Map — fills the viewport */}
      <div className="mapArea">
        <MapView />
      </div>
    </main>
  );
}
