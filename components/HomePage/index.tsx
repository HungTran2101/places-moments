"use client";

import Toolbar from "@/components/Toolbar";
import Sidebar from "@/components/Sidebar";
import Title from "@/components/Title";
import QueryProvider from "@/components/shared/QueryProvider";
import dynamic from "next/dynamic";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

export default function HomePageView() {
  return (
    <QueryProvider>
      <main className="main">
        <Title />
        <Toolbar />
        {/* Submission sidebar */}
        <Sidebar />
        {/* Map — fills the viewport */}
        <div className="mapArea">
          <MapView />
        </div>
      </main>
    </QueryProvider>
  );
}
