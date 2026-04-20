"use client";

import mapStyle from "@/styles/map-style.json";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import clsx from "clsx";
import type { Map as MapLibreMap, Point, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import MapLoading from "./MapLoading";

const LOADER_EXIT_DELAY_MS = 2100;
const INITIAL_MAP_ZOOM = 1;
const MAP_ENTRY_ZOOM = 3;
const MAP_ENTRY_ANIMATION_MS = 2500;
const MARKER_ROTATION_RESET_MS = 400;
const MAX_MARKER_ROTATION = 90;
const MIN_ROTATION_DELTA = 2;
const MAP_STYLE = mapStyle as StyleSpecification;

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerAddedRef = useRef(false);
  const markerRotationTimeoutRef = useRef<number | null>(null);
  const markerTransitionTimeoutRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  const setPin = usePinStore((state) => state.setPin);
  const mapReady = useSystemStore((state) => state.mapReady);
  const setMapReady = useSystemStore((state) => state.setMapReady);
  const [showLoader, setShowLoader] = useState(true);

  const clearMarkerRotationTimeout = () => {
    if (markerRotationTimeoutRef.current) {
      window.clearTimeout(markerRotationTimeoutRef.current);
      markerRotationTimeoutRef.current = null;
    }
  };

  const calculateRotationByDistance = (newPoint: Point, rotateVelocity = 0.002) => {
    const lastPoint = lastPointRef.current;
    if (!lastPoint) return 0;

    const dx = lastPoint.x - newPoint.x;
    if (Math.abs(dx) < MIN_ROTATION_DELTA) return 0;

    const angle = MAX_MARKER_ROTATION * Math.tanh(dx * rotateVelocity);
    return Math.max(-MAX_MARKER_ROTATION, Math.min(MAX_MARKER_ROTATION, angle));
  };

  useEffect(() => {
    setMapReady(false);
    markerAddedRef.current = false;
    lastPointRef.current = null;
    clearMarkerRotationTimeout();

    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (destroyed) return;

      const map = new maplibre.Map({
        container: containerRef.current!,
        style: MAP_STYLE,
        center: [0, 0],
        zoom: INITIAL_MAP_ZOOM,
        attributionControl: false,
      });

      const marker = new maplibre.Marker({
        color: "var(--marker-color)",
      }).setLngLat([0, 0]);

      map.once("load", () => {
        setMapReady(true);
        map.easeTo({
          zoom: MAP_ENTRY_ZOOM,
          duration: MAP_ENTRY_ANIMATION_MS,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
        lastPointRef.current = map.project(marker.getLngLat());
      });

      map.on("click", (event) => {
        clearMarkerRotationTimeout();
        marker.setLngLat(event.lngLat);

        if (!markerAddedRef.current) {
          marker.addTo(map);
          marker.addClassName("main-marker-move");
          markerAddedRef.current = true;
        } else {
          marker.setRotation(calculateRotationByDistance(event.point));
          marker.addClassName("main-marker-moving");
          markerRotationTimeoutRef.current = window.setTimeout(() => {
            marker.setRotation(0);
            markerRotationTimeoutRef.current = null;
          }, MARKER_ROTATION_RESET_MS);
          markerTransitionTimeoutRef.current = window.setTimeout(() => {
            marker.removeClassName("main-marker-moving");
            markerTransitionTimeoutRef.current = null;
          }, MARKER_ROTATION_RESET_MS + 400);
        }

        lastPointRef.current = event.point;
        setPin(event.lngLat.lat, event.lngLat.lng);
      });

      marker.on("click", (event) => {
        event.originalEvent.stopPropagation();
      });

      mapRef.current = map;

      if (destroyed) {
        marker.remove();
        map.remove();
      }
    })();

    return () => {
      destroyed = true;
      clearMarkerRotationTimeout();
      mapRef.current?.remove();
      mapRef.current = null;
      markerAddedRef.current = false;
      lastPointRef.current = null;
      if (markerRotationTimeoutRef.current) {
        window.clearTimeout(markerRotationTimeoutRef.current);
        markerRotationTimeoutRef.current = null;
      }
      if (markerTransitionTimeoutRef.current) {
        window.clearTimeout(markerTransitionTimeoutRef.current);
        markerTransitionTimeoutRef.current = null;
      }
    };
  }, [setMapReady, setPin]);

  useEffect(() => {
    if (!mapReady) {
      setShowLoader(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoader(false);
    }, LOADER_EXIT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mapReady]);

  return (
    <div className="MapView-wrapper">
      <div
        ref={containerRef}
        className={clsx("MapView-map", mapReady && "is-ready")}
      />
      {showLoader && <MapLoading />}
    </div>
  );
}
