"use client";

import LanguagesDropdown from "@/components/LanguagesDropdown";
import Sidebar from "@/components/Sidebar";
import Title from "@/components/Title";
import dynamic from "next/dynamic";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

export default function HomePage() {

  return (
    <main className="main">
      <Title />
      <LanguagesDropdown />

      {/* Submission sidebar */}
      <Sidebar />
      {/* Map — fills the viewport */}
      <div className="mapArea">
        <MapView />
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
        <defs>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.005 0.005" numOctaves="2" seed="92" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
            <feDisplacementMap in="SourceGraphic" in2="blurred" scale="70" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </main>
  );
}
