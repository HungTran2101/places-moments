"use client";

import ThoughtModal from "@/components/ThoughtModal";
import type { Submission } from "@/services/submissions";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import mapStyle from "@/styles/map-style.json";
import clsx from "clsx";
import type { Map as MapLibreMap, Point, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import MapLoading from "./MapLoading";
import {
  addSubmissionLayers,
  SUBMISSION_CLUSTER_LAYER,
  SUBMISSION_MARKER_LAYER,
} from "./submissionsLayer";

const LOADER_EXIT_DELAY_MS = 2100;
const INITIAL_MAP_ZOOM = 1;
const MAP_ENTRY_ZOOM = 3;
const MAP_ENTRY_ANIMATION_MS = 2500;
const MARKER_ROTATION_RESET_MS = 400;
const MAX_MARKER_ROTATION = 90;
const MIN_ROTATION_DELTA = 2;
const MAP_STYLE = mapStyle as StyleSpecification;

export default function MapView() {
  const t = useTranslations("map");

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
  const [submissionsError, setSubmissionsError] = useState(false);
  const [submissionsRetry, setSubmissionsRetry] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [thoughtModalOpen, setThoughtModalOpen] = useState(false);
  const [thoughtOrigin, setThoughtOrigin] = useState<{ x: number; y: number } | null>(null);

  const handleSubmissionClick = useCallback((submission: Submission, origin: { x: number; y: number }) => {
    setSelectedSubmission(submission);
    setThoughtOrigin(origin);
    setThoughtModalOpen(true);
  }, []);

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
        className: "main-marker",
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
        // Nhấn vào cụm hoặc suy nghĩ có sẵn không được di chuyển ghim soạn bài.
        const submissionLayers = [SUBMISSION_CLUSTER_LAYER, SUBMISSION_MARKER_LAYER]
          .filter((layer) => map.getLayer(layer));
        if (submissionLayers.length && map.queryRenderedFeatures(event.point, {
          layers: submissionLayers,
        }).length) return;

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
    const map = mapRef.current;
    if (!mapReady || !map) return;

    let cancelled = false;
    let removeSubmissionLayers: (() => void) | undefined;
    setSubmissionsError(false);
    // Chỉ thêm nguồn và layer sau khi style sẵn sàng; lỗi tải không chặn thao tác đặt ghim.
    void addSubmissionLayers(map, () => cancelled, handleSubmissionClick)
      .then((cleanup) => {
        if (cancelled) cleanup?.();
        else removeSubmissionLayers = cleanup;
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load map submissions", error);
        setSubmissionsError(true);
      });

    return () => {
      cancelled = true;
      // Dọn cả layer và listener trước khi thử lại, tránh nguồn trùng hoặc callback đã bị hủy.
      removeSubmissionLayers?.();
    };
  }, [mapReady, submissionsRetry, handleSubmissionClick]);

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
      <div className="MapView-disclaimer liquid-glass" aria-label="Map disclaimer">
        <p>{t('disclaimer')}</p>
      </div>
      {submissionsError && (
        <div className="MapView-submissionsError liquid-glass" role="status">
          <p>{t("submissionsLoadError")}</p>
          <button type="button" onClick={() => setSubmissionsRetry((value) => value + 1)}>
            {t("retry")}
          </button>
        </div>
      )}
      {showLoader && <MapLoading />}
      <ThoughtModal
        open={thoughtModalOpen}
        submission={selectedSubmission}
        origin={thoughtOrigin}
        onOpenChange={setThoughtModalOpen}
        onReturnFocus={() => mapRef.current?.getCanvas().focus({ preventScroll: true })}
      />
    </div>
  );
}
