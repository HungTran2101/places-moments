"use client";

import ThoughtModal from "@/components/ThoughtModal";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { cn } from "@/lib/utils";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore";
import mapStyle from "@/styles/map-style.json";
import type { Map as MapLibreMap, Point, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import MapLoading from "./MapLoading";
import {
  addSubmissionLayers,
  CLUSTER_MAX_ZOOM,
  loadSubmissionAssets,
  SUBMISSION_CLUSTER_LAYER,
  SUBMISSION_MARKER_LAYER,
} from "./submissionsLayer";

const LOADER_EXIT_DELAY_MS = 2100;
const INITIAL_MAP_ZOOM = 1;
const MAP_ENTRY_ZOOM = 3;
const MAP_ENTRY_ANIMATION_MS = 2500;
const SUBMISSION_ZOOM_DURATION_MS = 700;
const MARKER_ROTATION_RESET_MS = 400;
const MAX_MARKER_ROTATION = 90;
const MIN_ROTATION_DELTA = 2;
const MAP_STYLE = mapStyle as StyleSpecification;

export default function MapView() {
  const t = useTranslations("map");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinRef = useRef<import("maplibre-gl").Marker | null>(null);
  const pinAddedRef = useRef(false);
  const pinRotationTimeoutRef = useRef<number | null>(null);
  const pinTransitionTimeoutRef = useRef<number | null>(null);
  const lastPinPositionRef = useRef<Point | null>(null);
  const initialAssetsRef = useRef<ReturnType<typeof loadSubmissionAssets> | null>(null);
  const entryAnimationsReadyRef = useRef(false);

  const setPin = usePinStore((state) => state.setPin);
  const mapReady = useSystemStore((state) => state.mapReady);
  const setMapReady = useSystemStore((state) => state.setMapReady);

  const [showLoader, setShowLoader] = useState(true);
  const [submissionsError, setSubmissionsError] = useState(false);
  const [submissionsRetry, setSubmissionsRetry] = useState(0);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [thoughtModalOpen, setThoughtModalOpen] = useState(false);

  const handleSubmissionClick = useCallback((submissionId: string) => {
    setSelectedSubmissionId(submissionId);
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

      // Tải ảnh song song với basemap; vị trí chỉ tải theo viewport khi camera dừng.
      const assets = loadSubmissionAssets(map);
      initialAssetsRef.current = assets;
      // Ảnh có thể lỗi trước sự kiện load; effect thêm layer sẽ hiển thị lỗi sau đó.
      void assets.catch(() => { });

      const pin = new maplibre.Marker({
        color: "var(--marker-color)",
        className: "main-marker",
      }).setLngLat([0, 0]);
      pinRef.current = pin;

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
        if (useSubmissionMapStore.getState().isSubmitting) return;
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
      initialAssetsRef.current = null;
      clearPinRotationTimeout();
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
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
    let submissionLayers: Awaited<ReturnType<typeof addSubmissionLayers>>;
    const assets = initialAssetsRef.current ?? loadSubmissionAssets(map);
    initialAssetsRef.current = null;
    setSubmissionsError(false);
    // Chỉ thêm nguồn và layer sau khi style sẵn sàng; lỗi tải không chặn thao tác đặt ghim.
    void addSubmissionLayers({
      map,
      isCancelled: () => cancelled,
      onSubmissionClick: handleSubmissionClick,
      onLoadError: setSubmissionsError,
      isInteractionBlocked: () => useSubmissionMapStore.getState().isSubmitting,
      isEntryReady: () => entryAnimationsReadyRef.current,
      assets,
    })
      .then((layers) => {
        if (cancelled) { layers?.destroy(); return; }
        if (!layers) return;
        submissionLayers = layers;
        useSubmissionMapStore.getState().setMap({
          focus() {
            if (!cancelled) map.getCanvas().focus({ preventScroll: true });
          },
          async zoomToPin(signal) {
            signal.throwIfAborted();
            const pin = pinRef.current;
            if (cancelled || !pin) throw new Error("Pin is not available");

            // Zoom qua ngưỡng gom cụm để suy nghĩ vừa gửi luôn hiện thành marker riêng.
            await new Promise<void>((resolve, reject) => {
              const cleanup = () => {
                map.off("moveend", onMoveEnd);
                map.off("remove", onRemove);
                signal.removeEventListener("abort", onAbort);
              };
              const onMoveEnd = () => { cleanup(); resolve(); };
              const onRemove = () => { cleanup(); reject(new Error("Map was removed")); };
              const onAbort = () => {
                cleanup();
                map.stop();
                reject(signal.reason);
              };
              map.once("moveend", onMoveEnd);
              map.once("remove", onRemove);
              signal.addEventListener("abort", onAbort, { once: true });
              map.easeTo({
                center: pin.getLngLat(),
                zoom: Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1),
                duration: SUBMISSION_ZOOM_DURATION_MS,
              });
            });
          },
          getPinPosition() {
            const pin = pinRef.current;
            if (!pin) throw new Error("Pin is not available");
            const point = map.project(pin.getLngLat());
            const rect = map.getContainer().getBoundingClientRect();
            return { x: rect.left + point.x, y: rect.top + point.y };
          },
          prepareMarkerRefresh: layers.prepareRefresh,
          waitForMarkerAnimations: layers.waitForEntryAnimations,
          subscribeToResize(listener) {
            const subscription = map.on("resize", listener);
            return () => subscription.unsubscribe();
          },
          beginSubmission() {
            const pin = pinRef.current;
            if (!pin || !pinAddedRef.current) throw new Error("Pin is not available");
            const element = pin.getElement();
            const previousVisibility = element.style.visibility;
            // Chỉ ẩn ghim để giữ nguyên tọa độ đích của bubble và khôi phục đúng chỗ nếu lưu lỗi.
            element.style.visibility = "hidden";
            map.stop();
            // Ghi nhớ từng handler để trả lại đúng trạng thái trước lúc gửi, kể cả bàn phím và cảm ứng.
            const handlers = [map.dragPan, map.scrollZoom, map.boxZoom, map.dragRotate,
            map.keyboard, map.doubleClickZoom, map.touchZoomRotate, map.touchPitch];
            const enabledHandlers = handlers.filter((handler) => handler.isEnabled());
            enabledHandlers.forEach((handler) => handler.disable());
            const canvas = map.getCanvasContainer();
            const wasInert = canvas.inert;
            canvas.inert = true;
            return (saved) => {
              if (cancelled) return;
              element.style.visibility = previousVisibility;
              if (saved) {
                // API lưu đã thành công thì bỏ ghim soạn bài, kể cả khi tải lại marker bị lỗi.
                clearPinRotationTimeout();
                clearPinTransitionTimeout();
                pin.removeClassName("main-marker-move");
                pin.setRotation(0);
                pin.remove();
                pinAddedRef.current = false;
                lastPinPositionRef.current = null;
                usePinStore.getState().setIsPlaced(false);
              }
              enabledHandlers.forEach((handler) => handler.enable());
              canvas.inert = wasInert;
            };
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load map submissions", error);
        setSubmissionsError(true);
      });

    return () => {
      cancelled = true;
      useSubmissionMapStore.getState().setMap(null);
      // Dọn cả layer và listener trước khi thử lại, tránh nguồn trùng hoặc callback đã bị hủy.
      submissionLayers?.destroy();
    };
  }, [mapReady, submissionsRetry, handleSubmissionClick]);

  useEffect(() => {
    if (!mapReady) {
      entryAnimationsReadyRef.current = false;
      setShowLoader(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      // Bắt đầu hiệu ứng bubble sau màn mây để người xem thấy trọn chuyển động xuất hiện.
      entryAnimationsReadyRef.current = true;
      setShowLoader(false);
      mapRef.current?.triggerRepaint();
    }, LOADER_EXIT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mapReady]);

  return (
    <div className="MapView-wrapper">
      <div
        ref={containerRef}
        className={cn("MapView-map", mapReady && "is-ready")}
      />
      <RefractiveGlass>
        <div className="MapView-disclaimer" aria-label="Map disclaimer">
          <p>{t('disclaimer')}</p>
        </div>
      </RefractiveGlass>
      {submissionsError && (
        <RefractiveGlass>
          <div className="MapView-submissionsError" role="status">
            <p>{t("submissionsLoadError")}</p>
            <button type="button" onClick={() => setSubmissionsRetry((value) => value + 1)}>
              {t("retry")}
            </button>
          </div>
        </RefractiveGlass>
      )}
      {showLoader && <MapLoading />}
      <ThoughtModal
        open={thoughtModalOpen}
        submissionId={selectedSubmissionId}
        onOpenChange={setThoughtModalOpen}
        onReturnFocus={() => mapRef.current?.getCanvas().focus({ preventScroll: true })}
      />
    </div>
  );
}
