"use client";

import { usePinStore } from "@/store/usePinStore";
import type { Map as MapLibreMap, Marker, Point } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mainMarkerRef = useRef<Marker | null>(null);
  const mainMarkerAddedRef = useRef<boolean>(false);
  const markerRotationTimeoutRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const dragRafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const { setPin, setIsPlaced } = usePinStore((state) => state);

  const calculateRotationByDistance = (newPoint: Point, rotateVelocity: number = 0.002) => {
    const last = lastPointRef.current;
    if (!last) return 0;

    const dx = last.x - newPoint.x;
    if (Math.abs(dx) < 2) return 0;

    const MAX_ROTATION = 90;

    const angle = MAX_ROTATION * Math.tanh(dx * rotateVelocity);

    const fixedAngle = Math.max(
      -MAX_ROTATION,
      Math.min(MAX_ROTATION, angle)
    );

    return fixedAngle;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    let map: MapLibreMap;
    let marker: Marker;

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (destroyed) return;

      map = new maplibre.Map({
        container: containerRef.current!,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [0, 0],
        zoom: 3,
        attributionControl: false,
      });

      // Create the marker and add it to the map immediately
      marker = new maplibre.Marker({
        color: "#3b82f6",
      }).setLngLat([0, 0]) // Temporary coordinates

      map.on("load", () => {
        setReady(true);
        lastPointRef.current = map.project(marker.getLngLat());
      });

      map.on("click", (e) => {
        const newPoint = e.point;

        if (markerRotationTimeoutRef.current) {
          clearTimeout(markerRotationTimeoutRef.current);
        }

        marker.setLngLat(e.lngLat);

        if (!mainMarkerAddedRef.current) {
          marker.addTo(map);
          marker.addClassName('main-marker-move');
          mainMarkerAddedRef.current = true;
        } else {
          const angle = calculateRotationByDistance(newPoint);
          marker.setRotation(angle);
          markerRotationTimeoutRef.current = window.setTimeout(() => {
            marker.setRotation(0);
          }, 400);
        }

        lastPointRef.current = newPoint;

        const { lat, lng } = e.lngLat;
        setPin(lat, lng);
        setIsPlaced(true);
      });

      marker.on("dragstart", (e) => {
        const markerLngLat = e.target.getLngLat();
        lastPointRef.current = map.project(markerLngLat);
      });

      marker.on("drag", (markerEvent) => {
        if (dragRafRef.current) return;

        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;

          const markerLngLat = markerEvent.target.getLngLat();
          const newPoint = map.project(markerLngLat);

          const angle = calculateRotationByDistance(newPoint, 0.5);

          markerEvent.target.setRotation(angle);

          lastPointRef.current = newPoint;
        });
      });

      marker.on("dragend", (markerEvent) => {
        const { lat, lng } = markerEvent.target.getLngLat();

        marker.setRotation(0);

        setPin(lat, lng);
        setIsPlaced(true);
      });

      marker.on("click", (markerEvent) => {
        markerEvent.originalEvent.stopPropagation();
      })

      mapRef.current = map;
      mainMarkerRef.current = marker;
    })();

    return () => {
      destroyed = true;

      if (markerRotationTimeoutRef.current) {
        clearTimeout(markerRotationTimeoutRef.current);
      }

      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
      }

      mainMarkerRef.current?.remove();
      mapRef.current?.remove();

      mainMarkerRef.current = null;
      mapRef.current = null;
    };
  }, [setIsPlaced, setPin]);

  return (
    <div className="MapView-wrapper">
      <div ref={containerRef} className="MapView-map" />
      {!ready && (
        <div className="MapView-loader">
          <span className="MapView-loaderDot" />
          <span className="MapView-loaderDot" />
          <span className="MapView-loaderDot" />
        </div>
      )}
    </div>
  );
}
