"use client";

import ThoughtModal from "@/components/ThoughtModal";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { cn } from "@/lib/utils";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore";
import type { Map as MapLibreMap, Point } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import MapLoading from "./MapLoading";
import { createSpaceScene } from "./spaceScene";
import { getSpaceMinZoom, SPACE_DETAIL_MIN_ZOOM } from "./spaceStyle";
import {
  addSubmissionLayers,
  CLUSTER_MAX_ZOOM,
  loadSubmissionAssets,
  SUBMISSION_CLUSTER_LAYER,
  SUBMISSION_MARKER_LAYER,
} from "./submissionsLayer";
import { createTimeReveal } from "./timeReveal";
import { getTimeMapStyle, resolveMapTimeStage } from "./timeStyle";

const LOADER_EXIT_DELAY_MS = 2100;
const INITIAL_MAP_CENTER: [number, number] = [106, 16];
const INITIAL_MAP_ZOOM = 5.5;
const MAP_ENTRY_ZOOM = INITIAL_MAP_ZOOM + 0.5;
const MAP_ENTRY_ANIMATION_MS = 2500;
const SUBMISSION_ZOOM_DURATION_MS = 700;
const MARKER_ROTATION_RESET_MS = 400;
const MAX_MARKER_ROTATION = 90;
const MIN_ROTATION_DELTA = 2;

export default function MapView() {
  const t = useTranslations("map");

  const containerRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLCanvasElement>(null);
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

    // Khôi phục sau hydrate nhưng trước khi tạo map để không lóe sai bảng màu đã chọn.
    useSystemStore.getState().restoreMapTimeMode();

    let destroyed = false;
    let clearTimeStyle: (() => void) | undefined;
    let clearSpaceScene: (() => void) | undefined;
    const previousTimeStage = document.documentElement.getAttribute("data-map-time");
    const previousDarkMode = document.documentElement.classList.contains("dark");

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (destroyed) return;

      // Đọc giờ ngay trước khi tạo map để khung hình đầu đã dùng đúng bảng màu.
      const timeStage = resolveMapTimeStage(useSystemStore.getState().mapTimeMode, new Date());
      useSystemStore.getState().setMapTimeStage(timeStage);
      document.documentElement.dataset.mapTime = timeStage;
      // Class trên html giúp chữ và icon trong portal cũng dùng đúng bảng màu ban đêm.
      document.documentElement.classList.toggle("dark", timeStage === "nighttime");
      const map = new maplibre.Map({
        container: containerRef.current!,
        style: getTimeMapStyle(timeStage),
        center: INITIAL_MAP_CENTER,
        zoom: INITIAL_MAP_ZOOM,
        minZoom: getSpaceMinZoom(containerRef.current!.clientWidth, containerRef.current!.clientHeight),
        // Giữ một thế giới khi trở về Mercator; globe vẫn cho phép lùi camera ra không gian.
        renderWorldCopies: false,
        attributionControl: false,
      });
      if (spaceRef.current) clearSpaceScene = createSpaceScene(map, spaceRef.current);

      const timeReveal = createTimeReveal(map, timeStage);
      let timeCheckTimeout: number;
      let timeStyleReady = false;
      const syncTimeStyle = (animate = true) => {
        window.clearTimeout(timeCheckTimeout);
        if (destroyed) return;
        const now = new Date();
        const mode = useSystemStore.getState().mapTimeMode;
        const nextStage = resolveMapTimeStage(mode, now);
        // Chia sẻ khung giờ đã tính để icon Auto luôn khớp lịch đổi màu của map.
        useSystemStore.getState().setMapTimeStage(nextStage);
        if (timeStyleReady) timeReveal.setStage(nextStage, animate);
        // Chỉ theo dõi đồng hồ ở Auto; chế độ thủ công giữ nguyên đến khi được đổi lại.
        if (mode === "auto") {
          const delay = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
          timeCheckTimeout = window.setTimeout(() => syncTimeStyle(), delay);
        }
      };
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") syncTimeStyle();
      };
      const onFocus = () => syncTimeStyle();
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibilityChange);
      // Đăng ký riêng lựa chọn thời gian để đổi paint ngay mà không khởi tạo lại map.
      const unsubscribeTimeMode = useSystemStore.subscribe((state, previous) => {
        if (state.mapTimeMode !== previous.mapTimeMode) syncTimeStyle();
      });
      clearTimeStyle = () => {
        window.clearTimeout(timeCheckTimeout);
        timeReveal.destroy();
        unsubscribeTimeMode();
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
      syncTimeStyle();

      // Tải ảnh song song với basemap; vị trí chỉ tải theo viewport khi camera dừng.
      const assets = loadSubmissionAssets(map);
      initialAssetsRef.current = assets;
      // Ảnh có thể lỗi trước sự kiện load; effect thêm layer sẽ hiển thị lỗi sau đó.
      void assets.catch(() => { });

      const pin = new maplibre.Marker({
        color: "var(--marker-color)",
        className: "main-marker",
        opacityWhenCovered: "0",
      }).setLngLat(INITIAL_MAP_CENTER);
      pinRef.current = pin;

      map.once("load", () => {
        timeStyleReady = true;
        syncTimeStyle(false);
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
        // Unproject ngoài đường chân trời vẫn trả tọa độ; không cho nhấn vào sao để đặt ghim.
        if (!map.transform.isPointOnMapSurface(event.point)) return;
        // Nhấn vào cụm hoặc suy nghĩ có sẵn không được di chuyển ghim soạn bài.
        const submissionLayers = (map.getZoom() > SPACE_DETAIL_MIN_ZOOM
          ? [SUBMISSION_CLUSTER_LAYER, SUBMISSION_MARKER_LAYER] : [])
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
      clearTimeStyle?.();
      clearSpaceScene?.();
      if (previousTimeStage === null) delete document.documentElement.dataset.mapTime;
      else document.documentElement.setAttribute("data-map-time", previousTimeStage);
      document.documentElement.classList.toggle("dark", previousDarkMode);
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
      isInteractionBlocked: () => useSubmissionMapStore.getState().isSubmitting
        || map.getZoom() <= SPACE_DETAIL_MIN_ZOOM,
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
          openThought(submissionId) {
            if (!cancelled) handleSubmissionClick(submissionId);
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
      <canvas ref={spaceRef} className="MapView-space" aria-hidden="true" />
      <div
        ref={containerRef}
        className={cn("MapView-map", mapReady && "is-ready")}
      />
      <RefractiveGlass>
        <div className="MapView-disclaimer" role="note" aria-label={t("disclaimerLabel")}>
          <p>
            {t.rich("attribution", {
              osm: (chunks) => (
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
              carto: (chunks) => (
                <a href="https://carto.com/attribution/" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <p>
            <a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer">EOxCloudless</a>
            {" by "}
            <a href="https://maps.eox.at" target="_blank" rel="noopener noreferrer">EOX IT Services GmbH</a>
            {" (Contains modified Copernicus Sentinel data 2016) · "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          </p>
          <p>{t("disclaimer")}</p>
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
