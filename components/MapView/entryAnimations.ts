import { Marker, type Map as MapLibreMap } from "maplibre-gl";

const ENTRY_DURATION_MS = 500;
// Dùng chung các mốc nội suy với layer để điểm chuyển DOM/WebGL không đổi kích thước.
export const CLUSTER_WIDTH_STOPS = [2, 50, 25, 55, 50, 65, 75, 75, 100, 80];

interface BubbleImage {
  src: string;
  width: number;
  height: number;
}

interface EntryAnimationsOptions {
  map: MapLibreMap;
  sourceId: string;
  markerLayer: string;
  clusterLayer: string;
  markerImage: BubbleImage;
  clusterImage: BubbleImage;
  markerWidth: number;
  opacity: number;
  isReady: () => boolean;
}

export function addEntryAnimations({
  map, sourceId, markerLayer, clusterLayer, markerImage, clusterImage, markerWidth, opacity, isReady,
}: EntryAnimationsOptions) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const entries = new Map<string | number, { marker: Marker; animation: Animation }>();
  let visibleIds = new Set<string | number>();

  const removeEntry = (id: string | number) => {
    const entry = entries.get(id);
    if (!entry) return;
    entry.animation.onfinish = null;
    entry.animation.cancel();
    entry.marker.remove();
    entries.delete(id);
  };

  const updateEntries = () => {
    if (!isReady()) return;

    const features = map.queryRenderedFeatures({ layers: [clusterLayer, markerLayer] });
    const nextIds = new Set<string | number>();
    for (const feature of features) {
      const id = feature.id;
      if (id === undefined || feature.geometry.type !== "Point" || nextIds.has(id)) continue;
      nextIds.add(id);
      if (visibleIds.has(id)) continue;

      // Tôn trọng cài đặt giảm chuyển động và tránh tạo DOM khi không cần hiệu ứng.
      if (reducedMotion.matches) {
        map.setFeatureState({ source: sourceId, id }, { entered: true });
        continue;
      }

      const isCluster = feature.layer.id === clusterLayer;
      const image = isCluster ? clusterImage : markerImage;
      // Dùng cùng kích thước với layer để ảnh DOM khớp ảnh WebGL.
      const width = isCluster
        ? getClusterWidth(Number(feature.properties.point_count))
        : markerWidth;
      const element = document.createElement("div");
      element.dataset.submissionEntry = String(id);
      element.setAttribute("aria-hidden", "true");
      element.style.pointerEvents = "none";
      const bubble = document.createElement("img");
      bubble.src = image.src;
      bubble.alt = "";
      bubble.draggable = false;
      bubble.style.cssText = `display:block;width:${width}px;height:auto;aspect-ratio:${image.width}/${image.height};opacity:${opacity};transform:scale(0.05);transform-origin:bottom center`;
      element.append(bubble);

      const [lng, lat] = feature.geometry.coordinates;
      const wrappedLng = lng + 360 * Math.round((map.getCenter().lng - lng) / 360);
      const marker = new Marker({ element, anchor: "bottom", subpixelPositioning: true })
        .setLngLat([wrappedLng, lat]).addTo(map);
      // Animate ảnh con để giữ nguyên transform định vị của MapLibre khi pan hoặc zoom.
      const animation = bubble.animate([
        { transform: "scale(0.05)", offset: 0, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        { transform: "scale(1.1)", offset: 0.7, easing: "ease-in-out" },
        { transform: "scale(1)", offset: 1 },
      ], { duration: ENTRY_DURATION_MS, fill: "both" });
      entries.set(id, { marker, animation });
      animation.onfinish = () => {
        // Giữ ảnh DOM đến khung hình WebGL kế tiếp để không nháy lúc bàn giao.
        map.setFeatureState({ source: sourceId, id }, { entered: true });
        map.triggerRepaint();
      };
    }

    for (const id of visibleIds) {
      if (nextIds.has(id)) continue;
      removeEntry(id);
      map.setFeatureState({ source: sourceId, id }, { entered: false });
    }
    // Sự kiện render chạy sau khi WebGL đã vẽ trạng thái entered mới.
    for (const [id, entry] of entries) {
      if (entry.animation.playState === "finished"
        && map.getFeatureState({ source: sourceId, id }).entered) removeEntry(id);
    }
    visibleIds = nextIds;
  };

  map.on("render", updateEntries);

  return {
    async waitForIdle(signal: AbortSignal) {
      signal.throwIfAborted();
      if (!entries.size) return;

      // Chờ cả lượt nảy trước khi kết thúc luồng gửi, nhưng hủy ngay nếu form bị tháo.
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        void Promise.allSettled([...entries.values()].map((entry) => entry.animation.finished))
          .then(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          });
      });
      signal.throwIfAborted();
    },
    resetClusters() {
      for (const id of visibleIds) {
        // ID cụm có thể được tái sử dụng sau setData; ID dạng chuỗi của suy nghĩ vẫn giữ nguyên.
        if (typeof id !== "number") continue;
        removeEntry(id);
        map.setFeatureState({ source: sourceId, id }, { entered: false });
        visibleIds.delete(id);
      }
    },
    destroy() {
      map.off("render", updateEntries);
      for (const id of entries.keys()) removeEntry(id);
      visibleIds.clear();
    },
  };
}

function getClusterWidth(count: number) {
  for (let index = 2; index < CLUSTER_WIDTH_STOPS.length; index += 2) {
    const lowerCount = CLUSTER_WIDTH_STOPS[index - 2];
    const lowerWidth = CLUSTER_WIDTH_STOPS[index - 1];
    const upperCount = CLUSTER_WIDTH_STOPS[index];
    const upperWidth = CLUSTER_WIDTH_STOPS[index + 1];
    if (count <= upperCount) {
      const progress = Math.max(0, (count - lowerCount) / (upperCount - lowerCount));
      return lowerWidth + progress * (upperWidth - lowerWidth);
    }
  }
  return CLUSTER_WIDTH_STOPS[CLUSTER_WIDTH_STOPS.length - 1];
}
