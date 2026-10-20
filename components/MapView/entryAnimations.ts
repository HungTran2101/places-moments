import { Marker, type Map as MapLibreMap } from "maplibre-gl";

const ENTRY_DURATION_MS = 500;
// Dùng chung các mốc nội suy để bubble DOM và vùng nhấn của layer có cùng kích thước.
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

interface VisibleBubble {
  id: string | number;
  isCluster: boolean;
  settled: boolean;
  marker?: Marker;
  animation?: Animation;
}

export function addEntryAnimations({
  map, sourceId, markerLayer, clusterLayer, markerImage, clusterImage, markerWidth, opacity, isReady,
}: EntryAnimationsOptions) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visibleBubbles = new Map<string, VisibleBubble>();

  const removeEntry = (entry: VisibleBubble) => {
    if (entry.animation) {
      entry.animation.onfinish = null;
      entry.animation.cancel();
      entry.animation = undefined;
    }
    entry.marker?.remove();
    entry.marker = undefined;
  };

  const updateEntries = () => {
    if (!isReady() || !map.isSourceLoaded(sourceId)) return;

    const features = map.queryRenderedFeatures({ layers: [clusterLayer, markerLayer] });
    const nextBubbles = new Map<string, VisibleBubble>();
    const nextIds = new Set<string | number>();
    for (const feature of features) {
      const id = feature.id;
      if (id === undefined || feature.geometry.type !== "Point" || nextIds.has(id)) continue;
      nextIds.add(id);
      const isCluster = feature.layer.id === clusterLayer;
      const [lng, lat] = feature.geometry.coordinates;
      // ID cụm thay đổi khi setData; vị trí và số điểm giúp nhận lại cùng bubble đang hiển thị.
      const key = isCluster
        ? `cluster:${lng.toFixed(6)}:${lat.toFixed(6)}:${feature.properties.point_count}`
        : `marker:${id}`;
      const previous = nextBubbles.get(key) ?? visibleBubbles.get(key);
      if (previous) {
        if (previous.id !== id) {
          previous.id = id;
          if (!isCluster) map.setFeatureState({ source: sourceId, id }, { entered: previous.settled });
        }
        nextBubbles.set(key, previous);
        continue;
      }

      const entry: VisibleBubble = { id, isCluster, settled: reducedMotion.matches };
      nextBubbles.set(key, entry);
      // ID số có thể được dùng lại cho cụm khác; không kế thừa entered của cụm cũ.
      if (!isCluster) map.setFeatureState({ source: sourceId, id }, { entered: entry.settled });

      // Điểm lẻ giảm chuyển động dùng thẳng WebGL; cụm vẫn giữ cùng một ảnh DOM.
      if (entry.settled && !isCluster) continue;

      const image = isCluster ? clusterImage : markerImage;
      // Dùng cùng kích thước với layer để vùng nhấn khớp bubble.
      const width = isCluster
        ? getClusterWidth(Number(feature.properties.point_count))
        : markerWidth;
      const element = document.createElement("div");
      element.dataset.submissionEntry = key;
      element.setAttribute("aria-hidden", "true");
      element.style.pointerEvents = "none";
      const bubble = document.createElement("img");
      bubble.src = image.src;
      bubble.alt = "";
      bubble.draggable = false;
      bubble.style.cssText = `display:block;width:${width}px;height:auto;aspect-ratio:${image.width}/${image.height};opacity:${opacity};transform:scale(${entry.settled ? 1 : 0.05});transform-origin:bottom center`;
      element.append(bubble);

      const wrappedLng = lng + 360 * Math.round((map.getCenter().lng - lng) / 360);
      const marker = new Marker({ element, anchor: "bottom", subpixelPositioning: true })
        .setLngLat([wrappedLng, lat]).addTo(map);
      entry.marker = marker;
      if (entry.settled) continue;
      // Animate ảnh con để giữ nguyên transform định vị của MapLibre khi pan hoặc zoom.
      const animation = bubble.animate([
        { transform: "scale(0.05)", offset: 0, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        { transform: "scale(1.1)", offset: 0.7, easing: "ease-in-out" },
        { transform: "scale(1)", offset: 1 },
      ], { duration: ENTRY_DURATION_MS, fill: "both" });
      entry.animation = animation;
      animation.onfinish = () => {
        entry.settled = true;
        if (isCluster) {
          // Giữ nguyên bubble sau khi nảy, không chuyển qua WebGL hoặc trở lại scale ban đầu.
          bubble.style.transform = "scale(1)";
          animation.onfinish = null;
          animation.cancel();
          entry.animation = undefined;
        } else {
          // Điểm lẻ vẫn bàn giao về WebGL ở khung hình kế tiếp để giữ ít DOM trên bản đồ.
          map.setFeatureState({ source: sourceId, id: entry.id }, { entered: true });
          map.triggerRepaint();
        }
      };
    }

    for (const [key, entry] of visibleBubbles) {
      if (nextBubbles.has(key)) continue;
      removeEntry(entry);
      if (!entry.isCluster && !nextIds.has(entry.id)) {
        map.setFeatureState({ source: sourceId, id: entry.id }, { entered: false });
      }
    }
    // Sự kiện render chạy sau khi WebGL đã vẽ trạng thái entered mới.
    for (const entry of nextBubbles.values()) {
      if (!entry.isCluster && entry.animation?.playState === "finished" && entry.settled) removeEntry(entry);
    }
    visibleBubbles = nextBubbles;
  };

  map.on("render", updateEntries);

  return {
    async waitForIdle(signal: AbortSignal) {
      signal.throwIfAborted();
      const animations = [...visibleBubbles.values()].flatMap((entry) => entry.animation ? [entry.animation] : []);
      if (!animations.length) return;

      // Chờ cả lượt nảy trước khi kết thúc luồng gửi, nhưng hủy ngay nếu form bị tháo.
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        void Promise.allSettled(animations.map((animation) => animation.finished))
          .then(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          });
      });
      signal.throwIfAborted();
    },
    destroy() {
      map.off("render", updateEntries);
      for (const entry of visibleBubbles.values()) removeEntry(entry);
      visibleBubbles.clear();
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
