"use client";

import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import mapStyle from "@/styles/map-style.json";
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
  const pinAddedRef = useRef(false);
  const pinRotationTimeoutRef = useRef<number | null>(null);
  const pinTransitionTimeoutRef = useRef<number | null>(null);
  const lastPinPositionRef = useRef<Point | null>(null);

  const setPin = usePinStore((state) => state.setPin);
  const mapReady = useSystemStore((state) => state.mapReady);
  const setMapReady = useSystemStore((state) => state.setMapReady);
  const [showLoader, setShowLoader] = useState(true);

  const clearPinRotationTimeout = () => {
    if (pinRotationTimeoutRef.current) {
      window.clearTimeout(pinRotationTimeoutRef.current);
      pinRotationTimeoutRef.current = null;
    }
  };

  const clearPinTransitionTimeout = () => {
    if (pinTransitionTimeoutRef.current) {
      window.clearTimeout(pinTransitionTimeoutRef.current);
      pinTransitionTimeoutRef.current = null;
    }
  };

  const calculateRotationByDistance = (newPoint: Point, rotateVelocity = 0.002) => {
    const lastPoint = lastPinPositionRef.current;
    if (!lastPoint) return 0;

    const dx = lastPoint.x - newPoint.x;
    if (Math.abs(dx) < MIN_ROTATION_DELTA) return 0;

    const angle = MAX_MARKER_ROTATION * Math.tanh(dx * rotateVelocity);
    return Math.max(-MAX_MARKER_ROTATION, Math.min(MAX_MARKER_ROTATION, angle));
  };

  useEffect(() => {
    setMapReady(false);
    pinAddedRef.current = false;
    lastPinPositionRef.current = null;
    clearPinRotationTimeout();

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

      const pin = new maplibre.Marker({
        color: "var(--marker-color)",
        className: 'main-marker'
      }).setLngLat([0, 0]);

      map.once("load", () => {
        setMapReady(true);
        map.easeTo({
          zoom: MAP_ENTRY_ZOOM,
          duration: MAP_ENTRY_ANIMATION_MS,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
        lastPinPositionRef.current = map.project(pin.getLngLat());
      });

      map.on("click", (event) => {
        clearPinRotationTimeout();
        pin.setLngLat(event.lngLat);

        if (!pinAddedRef.current) {
          pin.addTo(map);
          pinAddedRef.current = true;
        } else {
          clearPinTransitionTimeout();
          pin.setRotation(calculateRotationByDistance(event.point));
          pin.addClassName("main-marker-move");
          pinRotationTimeoutRef.current = window.setTimeout(() => {
            pin.setRotation(0);
            pinRotationTimeoutRef.current = null;
          }, MARKER_ROTATION_RESET_MS);
          pinTransitionTimeoutRef.current = window.setTimeout(() => {
            pin.removeClassName("main-marker-move");
            pinTransitionTimeoutRef.current = null;
          }, MARKER_ROTATION_RESET_MS + 400);
        }

        lastPinPositionRef.current = event.point;
        setPin(event.lngLat.lat, event.lngLat.lng);
      });

      pin.on("click", (event) => {
        event.originalEvent.stopPropagation();
      });

      mapRef.current = map;

      if (destroyed) {
        pin.remove();
        map.remove();
      }
    })();

    return () => {
      destroyed = true;
      clearPinRotationTimeout();
      mapRef.current?.remove();
      mapRef.current = null;
      pinAddedRef.current = false;
      lastPinPositionRef.current = null;
      if (pinRotationTimeoutRef.current) {
        window.clearTimeout(pinRotationTimeoutRef.current);
        pinRotationTimeoutRef.current = null;
      }
      if (pinTransitionTimeoutRef.current) {
        window.clearTimeout(pinTransitionTimeoutRef.current);
        pinTransitionTimeoutRef.current = null;
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
