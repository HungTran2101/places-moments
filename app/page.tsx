"use client";

import Sidebar from "@/components/Sidebar";
import dynamic from "next/dynamic";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

export default function HomePage() {

  return (
    <main className="main">
      {/* Submission sidebar */}
      <Sidebar />
      {/* Map — fills the viewport */}
      <div className="mapArea">
        <MapView />
      </div>
    </main>
  );
}
