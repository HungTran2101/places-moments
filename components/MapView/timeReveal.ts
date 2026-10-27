import type { Map as MapLibreMap } from "maplibre-gl";
import { getMapPaintProperties, type MapTimeStage } from "./timeStyle";

const REVEAL_DURATION_MS = 700;
const REVEAL_FEATHER_PX = 50;

export function createTimeReveal(map: MapLibreMap, initialStage: MapTimeStage) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentStage = initialStage;
  let requestedStage = initialStage;
  let frame: number | undefined;
  let transition: ViewTransition | undefined;
  let animation: Animation | undefined;
  let destroyed = false;

  const applyStage = () => {
    if (destroyed || requestedStage === currentStage) return;
    root.setAttribute("data-map-time-reveal", "");
    // Đổi paint tại chỗ để giữ camera, nguồn dữ liệu và toàn bộ ghim đang có.
    for (const { layerId, paint } of getMapPaintProperties(requestedStage)) {
      for (const [property, value] of Object.entries(paint)) {
        map.setPaintProperty(layerId, `${property}-transition`, { duration: 0, delay: 0 });
        map.setPaintProperty(layerId, property, value);
      }
    }
    currentStage = requestedStage;
    root.dataset.mapTime = currentStage;
    root.classList.toggle("dark", currentStage === "nighttime");
    // Chốt CSS và WebGL trước snapshot mới, tránh chụp nền trống hoặc màu đang fade.
    void root.offsetWidth;
    map.redraw();
  };

  const cancelFrame = () => {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
  };

  const settle = () => {
    cancelFrame();
    transition?.skipTransition();
    animation?.cancel();
    applyStage();
    root.removeAttribute("data-map-time-reveal");
  };

  const schedule = () => {
    if (destroyed || frame !== undefined || transition || requestedStage === currentStage) return;
    // Đợi React/Radix đóng menu và trả focus về nút trước khi chụp trang cũ.
    frame = window.requestAnimationFrame(() => {
      frame = undefined;
      if (destroyed || requestedStage === currentStage) return;
      if (reducedMotion.matches || !document.startViewTransition || document.visibilityState !== "visible") {
        settle();
        return;
      }

      const trigger = document.getElementById("time-menu-trigger")?.getBoundingClientRect();
      const x = trigger ? trigger.left + trigger.width / 2 : window.innerWidth / 2;
      const y = trigger ? trigger.top + trigger.height / 2 : window.innerHeight / 2;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      ) + REVEAL_FEATHER_PX + 1;

      root.setAttribute("data-map-time-reveal", "");
      // Vẽ lại khung cũ ngay trước snapshot vì WebGL không giữ drawing buffer mặc định.
      map.redraw();
      try {
        const nextTransition = document.startViewTransition(applyStage);
        transition = nextTransition;
        void nextTransition.ready.then(() => {
          if (destroyed || requestedStage !== currentStage) {
            nextTransition.skipTransition();
            return;
          }
          // Chỉ hòa hai bảng màu trong dải mép 24px; vùng bên trong vẫn giữ nguyên màu mới.
          animation = root.animate({
            "--map-time-reveal-radius": ["0px", `${radius}px`],
            "--map-time-reveal-x": [`${x}px`, `${x}px`],
            "--map-time-reveal-y": [`${y}px`, `${y}px`],
            "--map-time-reveal-feather": [`${REVEAL_FEATHER_PX}px`, `${REVEAL_FEATHER_PX}px`],
          }, {
            duration: REVEAL_DURATION_MS,
            // Mở nhanh, chậm lại ở giữa rồi tăng tốc để phủ hết viewport.
            easing: "cubic-bezier(0.15, 0.85, 0.85, 0.15)",
            fill: "both",
            pseudoElement: "::view-transition-new(root)",
          });
          void animation.finished.catch(() => { /* Hủy reveal khi có lựa chọn mới hoặc resize. */ });
        }).catch(() => {
          // API có thể bỏ qua snapshot; callback vẫn cập nhật bảng màu mà không fade.
          nextTransition.skipTransition();
        });
        void nextTransition.finished.catch(() => {
          if (!destroyed) applyStage();
        }).finally(() => {
          if (transition !== nextTransition) return;
          transition = undefined;
          if (destroyed) return;
          animation?.cancel();
          animation = undefined;
          root.removeAttribute("data-map-time-reveal");
          // Chỉ chạy lựa chọn mới nhất sau khi overlay cũ đã kết thúc hoàn toàn.
          schedule();
        });
      } catch {
        settle();
      }
    });
  };

  const onMotionChange = () => {
    if (reducedMotion.matches) settle();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") settle();
  };
  window.addEventListener("resize", settle);
  reducedMotion.addEventListener("change", onMotionChange);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    setStage(stage: MapTimeStage, animate = true) {
      if (destroyed) return;
      requestedStage = stage;
      if (!animate || reducedMotion.matches || !document.startViewTransition || document.visibilityState !== "visible") {
        settle();
      } else if (transition && requestedStage !== currentStage) {
        transition.skipTransition();
        animation?.cancel();
      } else {
        schedule();
      }
    },
    destroy() {
      destroyed = true;
      settle();
      window.removeEventListener("resize", settle);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
