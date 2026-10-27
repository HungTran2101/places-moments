import type { Map as MapLibreMap } from "maplibre-gl";
import { getMapMarkerOpacity, getMapMarkerScale, getSpaceMinZoom, SPACE_FADE_END_ZOOM, SPACE_FADE_START_ZOOM } from "./spaceStyle";

type Star = { x: number; y: number; z: number; radius: number; alpha: number; color: string };

function createStars(): Star[] {
  let seed = 731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Phân bố trên thiên cầu, thêm một dải sao mờ thay vì lặp lại texture hay chấm theo lưới.
  return Array.from({ length: 1000 }, (_, index) => {
    const longitude = random() * Math.PI * 2;
    const latitude = index < 6000
      ? Math.asin(random() * 2 - 1)
      : (random() + random() + random() - 1.5) * 0.18;
    const brightness = Math.pow(random(), 5);
    const x = Math.cos(latitude) * Math.cos(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.sin(longitude);
    const tilt = 0.65;
    return {
      x, y: y * Math.cos(tilt) - z * Math.sin(tilt), z: y * Math.sin(tilt) + z * Math.cos(tilt),
      radius: 0.35 + brightness * 1.05,
      alpha: 0.12 + brightness * 0.7,
      color: index % 9 === 0 ? "255,220,185" : index % 4 === 0 ? "184,209,255" : "233,239,255",
    };
  });
}

export function createSpaceScene(map: MapLibreMap, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return () => { };
  const stars = createStars();
  const root = document.documentElement;
  const previousSpace = root.getAttribute("data-map-space");
  let width = 0;
  let height = 0;
  let previousCamera = "";

  const draw = () => {
    const zoom = map.getZoom();
    const opacity = Math.max(0, Math.min(1,
      (SPACE_FADE_END_ZOOM - zoom) / (SPACE_FADE_END_ZOOM - SPACE_FADE_START_ZOOM)));
    canvas.style.opacity = String(opacity);
    const detailOpacity = getMapMarkerOpacity(zoom, map.getMinZoom());
    map.getContainer().style.setProperty("--map-detail-opacity", String(detailOpacity));
    map.getContainer().style.setProperty("--map-marker-scale", String(getMapMarkerScale(zoom)));
    // Giữ chữ/icon sáng trên nền không gian, độc lập với lựa chọn giờ của bản đồ.
    root.toggleAttribute("data-map-space", zoom < (SPACE_FADE_START_ZOOM + SPACE_FADE_END_ZOOM) / 2);
    if (opacity === 0) return;

    const center = map.getCenter();
    const camera = `${center.lng},${center.lat},${map.getBearing()},${map.getPitch()},${width},${height}`;
    if (camera === previousCamera) return;
    previousCamera = camera;
    context.clearRect(0, 0, width, height);

    const longitude = center.lng * Math.PI / 180;
    const latitude = (center.lat + map.getPitch()) * Math.PI / 180;
    const bearing = map.getBearing() * Math.PI / 180;
    const sinLng = Math.sin(longitude);
    const cosLng = Math.cos(longitude);
    const sinLat = Math.sin(latitude);
    const cosLat = Math.cos(latitude);
    const focalLength = height / (2 * Math.tan(Math.PI / 6));

    for (const star of stars) {
      const forward = star.x * cosLat * cosLng + star.y * sinLat + star.z * cosLat * sinLng;
      if (forward <= 0.1) continue;
      const east = -star.x * sinLng + star.z * cosLng;
      const north = -star.x * sinLat * cosLng + star.y * cosLat - star.z * sinLat * sinLng;
      const x = width / 2 + (east * Math.cos(bearing) + north * Math.sin(bearing)) * focalLength / forward;
      const y = height / 2 - (north * Math.cos(bearing) - east * Math.sin(bearing)) * focalLength / forward;
      if (x < -3 || x > width + 3 || y < -3 || y > height + 3) continue;
      if (star.alpha > 0.65) {
        const glow = context.createRadialGradient(x, y, 0, x, y, star.radius * 3.5);
        glow.addColorStop(0, `rgba(${star.color},0.2)`);
        glow.addColorStop(1, `rgba(${star.color},0)`);
        context.fillStyle = glow;
        context.fillRect(x - 5, y - 5, 10, 10);
      }
      context.fillStyle = `rgba(${star.color},${star.alpha})`;
      context.beginPath();
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
  };

  const resize = () => {
    width = map.getContainer().clientWidth;
    height = map.getContainer().clientHeight;
    map.setMinZoom(getSpaceMinZoom(width, height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    previousCamera = "";
    draw();
  };
  map.on("move", draw);
  map.on("resize", resize);
  resize();

  return () => {
    // Không chạy vòng lặp khi camera đứng yên; tháo listener trước khi hủy map.
    map.off("move", draw);
    map.off("resize", resize);
    if (previousSpace === null) root.removeAttribute("data-map-space");
    else root.setAttribute("data-map-space", previousSpace);
  };
}
