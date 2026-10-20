import thoughtBubbleImg from "@/public/assets/thought_bubble.webp";
import clusterBubbleImg from "@/public/assets/cluster_bubble.webp";
import { getSubmissions, type Submission } from "@/services/submissions";
import { Marker, type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";

const SOURCE_ID = "submissions";
const IMAGE_ID = "submission-thought-bubble";
const CLUSTER_IMAGE_ID = "submission-cluster-bubble";

const MARKER_WIDTH = 35;
const MARKER_ICON_SIZE = MARKER_WIDTH / thoughtBubbleImg.width;
const MARKER_HOVER_SCALE = 1.1;
const MARKER_HOVER_DURATION_MS = 180;
const MARKER_OPACITY = 0.5;

export const SUBMISSION_CLUSTER_LAYER = "submission-clusters";
export const SUBMISSION_MARKER_LAYER = "submission-markers";

export const CLUSTER_MAX_ZOOM = 5;
const CLUSTER_RADIUS = 30;
const CLUSTER_MIN_WIDTH = 50;
const CLUSTER_MAX_WIDTH = 80;

function toFeatureCollection(submissions: Submission[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: submissions.map((submission) => ({
      type: "Feature",
      properties: { submissionId: submission.id },
      geometry: { type: "Point", coordinates: [submission.lng, submission.lat] },
    })),
  };
}

export function loadSubmissionAssets(map: MapLibreMap, signal?: AbortSignal) {
  return Promise.all([
    getSubmissions({ signal }),
    map.loadImage(thoughtBubbleImg.src),
    map.loadImage(clusterBubbleImg.src),
  ]);
}

interface AddSubmissionLayersOptions {
  map: MapLibreMap;
  isCancelled: () => boolean;
  onSubmissionClick: (submission: Submission, origin: { x: number; y: number }) => void;
  isInteractionBlocked: () => boolean;
  assets?: ReturnType<typeof loadSubmissionAssets>;
}

export async function addSubmissionLayers({
  map,
  isCancelled,
  onSubmissionClick,
  isInteractionBlocked,
  assets = loadSubmissionAssets(map),
}: AddSubmissionLayersOptions) {
  const [submissions, image, clusterImage] = await assets;

  // Không cập nhật bản đồ nếu component đã unmount trong lúc tải dữ liệu hoặc ảnh.
  if (isCancelled()) return;

  // Tra cứu dữ liệu đã tải bằng ID, không gọi lại API hoặc đưa nội dung suy nghĩ vào vector tile.
  const submissionsById = new Map(submissions.map((submission) => [submission.id, submission]));

  const subscriptions: { unsubscribe: () => void }[] = [];
  const removeLayers = () => {
    if (!map.getStyle()) return;
    // Xóa layer trước nguồn và ảnh để MapLibre không giữ tham chiếu tới tài nguyên đã mất.
    for (const layer of [SUBMISSION_MARKER_LAYER, SUBMISSION_CLUSTER_LAYER]) {
      if (map.getLayer(layer)) map.removeLayer(layer);
    }
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID);
    if (map.hasImage(CLUSTER_IMAGE_ID)) map.removeImage(CLUSTER_IMAGE_ID);
  };

  try {
    map.addImage(IMAGE_ID, image.data);
    map.addImage(CLUSTER_IMAGE_ID, clusterImage.data);
    map.addSource(SOURCE_ID, {
      type: "geojson",
      // Giữ nguyên ID dạng chuỗi khi MapLibre chuyển dữ liệu sang vector tile.
      promoteId: "submissionId",
      // Chỉ gom các điểm gần nhau khi mức zoom không vượt quá CLUSTER_MAX_ZOOM.
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
      data: toFeatureCollection(submissions),
    });

    map.addLayer({
      id: SUBMISSION_CLUSTER_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "icon-image": CLUSTER_IMAGE_ID,
        // Cụm càng nhiều suy nghĩ càng lớn, tối đa 60 px và giữ nguyên tỉ lệ ảnh gốc.
        "icon-size": ["/", ["interpolate", ["linear"], ["get", "point_count"],
          2, CLUSTER_MIN_WIDTH,
          25, 55,
          50, 65,
          75, 75,
          100, CLUSTER_MAX_WIDTH,
        ], clusterBubbleImg.width],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: { "icon-opacity": MARKER_OPACITY },
    });
    map.addLayer({
      id: SUBMISSION_MARKER_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": IMAGE_ID,
        // Thu phóng đồng đều để ảnh rộng 35 px, chiều cao tự thay đổi theo tỉ lệ gốc.
        "icon-size": MARKER_ICON_SIZE,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        // Tạm ẩn ảnh WebGL khi ảnh DOM ở cùng vị trí đang chạy hiệu ứng hover.
        "icon-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0, MARKER_OPACITY],
        "icon-opacity-transition": { duration: 0 },
      },
    });
  } catch (error) {
    // Một bước khởi tạo thất bại vẫn phải dọn phần đã thêm để lần thử lại bắt đầu sạch.
    removeLayers();
    throw error;
  }

  let hoveredId: string | null = null;
  const overlays = new Map<string, { marker: Marker; animation: Animation }>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const removeOverlay = (id: string, restoreIcon = true) => {
    const overlay = overlays.get(id);
    if (!overlay) return;
    overlay.animation.onfinish = null;
    overlay.animation.cancel();
    overlay.marker.remove();
    overlays.delete(id);
    if (restoreIcon) map.setFeatureState({ source: SOURCE_ID, id }, { hover: false });
  };
  const clearHover = () => {
    const previousId = hoveredId;
    hoveredId = null;
    map.getCanvas().style.cursor = "";
    if (previousId === null) return;

    const overlay = overlays.get(previousId);
    if (!overlay) return;
    // Đảo chiều từ tiến độ hiện tại để rê chuột nhanh vẫn chuyển động liên tục.
    if (reducedMotion.matches || overlay.animation.currentTime === 0) {
      removeOverlay(previousId);
    } else {
      overlay.animation.reverse();
    }
  };

  subscriptions.push(map.on("mousemove", (event) => {
    if (isInteractionBlocked()) { clearHover(); return; }
    // Một lần hit-test chung cho điểm lẻ và cụm, tránh bốn truy vấn cho mỗi lần rê chuột.
    const features = map.queryRenderedFeatures(event.point, {
      layers: [SUBMISSION_MARKER_LAYER, SUBMISSION_CLUSTER_LAYER],
    });
    const feature = features.find((feature) => feature.layer.id === SUBMISSION_MARKER_LAYER);
    const id = feature?.properties.submissionId;
    if (typeof id !== "string" || feature?.geometry.type !== "Point") {
      clearHover();
      if (features.some((feature) => feature.layer.id === SUBMISSION_CLUSTER_LAYER)) {
        map.getCanvas().style.cursor = "pointer";
      }
      return;
    }
    if (id === hoveredId) return;
    clearHover();
    hoveredId = id;
    map.getCanvas().style.cursor = "pointer";

    const existing = overlays.get(id);
    if (existing) {
      existing.animation.reverse();
      return;
    }

    // Chỉ tạo DOM cho điểm đang hover; các điểm còn lại vẫn được vẽ và gom cụm bằng WebGL.
    const element = document.createElement("div");
    element.dataset.submissionHover = id;
    element.setAttribute("aria-hidden", "true");
    element.style.pointerEvents = "none";
    const bubble = document.createElement("img");
    bubble.src = thoughtBubbleImg.src;
    bubble.alt = "";
    bubble.draggable = false;
    // Giữ sẵn tỉ lệ ảnh để marker không lệch vị trí trong lúc trình duyệt giải mã ảnh.
    bubble.style.cssText = `display:block;width:${MARKER_WIDTH}px;height:auto;aspect-ratio:${thoughtBubbleImg.width}/${thoughtBubbleImg.height};opacity:${MARKER_OPACITY};transform-origin:bottom center`;
    element.append(bubble);

    const [lng, lat] = feature.geometry.coordinates;
    const wrappedLng = lng + 360 * Math.round((event.lngLat.lng - lng) / 360);
    const marker = new Marker({ element, anchor: "bottom", subpixelPositioning: true })
      .setLngLat([wrappedLng, lat]).addTo(map);
    // Animate transform trên ảnh con để không ghi đè transform định vị của MapLibre.
    const animation = bubble.animate(
      [{ transform: "scale(1)" }, { transform: `scale(${MARKER_HOVER_SCALE})` }],
      { duration: reducedMotion.matches ? 0 : MARKER_HOVER_DURATION_MS, easing: "ease-out", fill: "both" },
    );
    overlays.set(id, { marker, animation });
    map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
    animation.onfinish = () => {
      if (hoveredId !== id) removeOverlay(id);
    };
  }));
  subscriptions.push(map.on("mouseout", clearHover));
  subscriptions.push(map.on("click", SUBMISSION_MARKER_LAYER, (event) => {
    if (isInteractionBlocked()) return;
    const id = event.features?.[0]?.properties.submissionId;
    const submission = typeof id === "string" ? submissionsById.get(id) : undefined;
    if (!submission || isCancelled()) return;
    clearOverlays(true);
    // Lưu tọa độ chuột trong viewport để hiệu ứng mở bắt đầu đúng nơi vừa nhấn.
    onSubmissionClick(submission, {
      x: event.originalEvent.clientX,
      y: event.originalEvent.clientY,
    });
  }));

  const clearOverlays = (restoreIcons: boolean) => {
    hoveredId = null;
    map.getCanvas().style.cursor = "";
    for (const id of overlays.keys()) removeOverlay(id, restoreIcons);
  };
  // Dọn ảnh và animation khi đổi vùng nhìn hoặc tháo bản đồ, tránh giữ DOM không còn dùng.
  subscriptions.push(map.on("movestart", () => clearOverlays(true)));
  subscriptions.push(map.on("remove", () => clearOverlays(false)));

  subscriptions.push(map.on("click", SUBMISSION_CLUSTER_LAYER, async (event) => {
    if (isInteractionBlocked()) return;
    // Khi ảnh chồng nhau, ưu tiên suy nghĩ lẻ đang được vẽ trên cụm thay vì vừa mở modal vừa zoom.
    if (map.queryRenderedFeatures(event.point, { layers: [SUBMISSION_MARKER_LAYER] }).length) return;
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;

    try {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      if (isCancelled() || isInteractionBlocked()) return;

      const [lng, lat] = feature.geometry.coordinates;
      // Chọn đúng bản sao của cụm khi bản đồ lặp lại qua kinh tuyến 180 độ.
      const wrappedLng = lng + 360 * Math.round((event.lngLat.lng - lng) / 360);
      map.easeTo({ center: [wrappedLng, lat], zoom, duration: 500 });
    } catch (error) {
      if (!isCancelled()) console.error("Failed to expand submission cluster", error);
    }
  }));

  return {
    async prepareRefresh(signal: AbortSignal) {
      const submissions = await getSubmissions({ signal });
      signal.throwIfAborted();
      if (isCancelled()) throw new Error("Map is no longer available");

      // Giữ dữ liệu đã tải ngoài source để marker mới hoặc cụm chưa xuất hiện trước bubble đang bay.
      return async () => {
        signal.throwIfAborted();
        if (isCancelled()) throw new Error("Map is no longer available");
        clearOverlays(true);
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        // Chờ worker cập nhật nguồn trước khi bỏ bubble đang gửi; không dựng lại toàn bộ layer.
        await source.setData(toFeatureCollection(submissions), true);
        signal.throwIfAborted();
        if (isCancelled()) throw new Error("Map is no longer available");
        submissionsById.clear();
        for (const submission of submissions) submissionsById.set(submission.id, submission);
        map.triggerRepaint();
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            map.off("render", onRender);
            map.off("remove", onRemove);
            signal.removeEventListener("abort", onAbort);
          };
          const onRender = () => {
            if (!map.isSourceLoaded(SOURCE_ID)) return;
            cleanup();
            resolve();
          };
          const onRemove = () => { cleanup(); reject(new Error("Map was removed")); };
          const onAbort = () => { cleanup(); reject(signal.reason); };
          map.on("render", onRender);
          map.once("remove", onRemove);
          signal.addEventListener("abort", onAbort, { once: true });
        });
      };
    },
    destroy() {
      for (const subscription of subscriptions) subscription.unsubscribe();
      clearOverlays(false);
      removeLayers();
    },
  };
}
