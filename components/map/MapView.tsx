"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MapView.module.scss";

interface MapViewProps {
  onPinMoved?: (lat: number, lng: number) => void;
}

export default function MapView({ onPinMoved }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    let marker: Marker;

    (async () => {
      const maplibre = await import("maplibre-gl");

      map = new maplibre.Map({
        container: containerRef.current!,
        style: "https://demotiles.maplibre.org/style.json",
        center: [0, 20],
        zoom: 2,
        attributionControl: false,
      });

      marker = new maplibre.Marker({ draggable: true, color: "#a78bfa" })
        .setLngLat([0, 20])
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onPinMoved?.(lat, lng);
      });

      map.on("load", () => setReady(true));

      mapRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onPinMoved]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.map} />
      {!ready && (
        <div className={styles.loader}>
          <span className={styles.loaderDot} />
          <span className={styles.loaderDot} />
          <span className={styles.loaderDot} />
        </div>
      )}
    </div>
  );
}
