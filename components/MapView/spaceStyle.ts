import type { StyleSpecification } from "maplibre-gl";

export const SPACE_SOURCE = "eox-earth";
export const SPACE_LAYER = "eox-earth-surface";
export const SPACE_FADE_START_ZOOM = 5;
export const SPACE_FADE_END_ZOOM = 5.5;
// Projection và kích thước marker cùng hoàn tất theo khoảng fade, tránh lệch khi chỉnh zoom.
export const GLOBE_ZOOM = SPACE_FADE_START_ZOOM;
export const FLAT_MAP_ZOOM = SPACE_FADE_END_ZOOM;
export const GLOBE_MARKER_SCALE = 0.45;
export const GLOBE_MARKER_MIN_OPACITY = 0.08;
export const SPACE_DETAIL_MIN_ZOOM = 1.25;

export function getSpaceMinZoom(width: number, height: number) {
  // Giữ đường kính Trái Đất gần 65% cạnh ngắn, thay vì lùi thành một chấm trên màn hình lớn.
  return Math.max(0.5, Math.min(3, Math.log2(Math.max(1, Math.min(width, height)) * 0.8 * Math.PI / 512)));
}

export function getMapMarkerScale(zoom: number) {
  const progress = Math.max(0, Math.min(1, (zoom - GLOBE_ZOOM) / (FLAT_MAP_ZOOM - GLOBE_ZOOM)));
  return GLOBE_MARKER_SCALE + (1 - GLOBE_MARKER_SCALE) * progress;
}

export function getMapMarkerOpacity(zoom: number, minZoom: number) {
  // Lấy mức zoom-out thực tế để desktop và mobile đều chỉ còn thấy marker rất mờ ở xa nhất.
  const progress = Math.max(0, Math.min(1, (zoom - minZoom) / (SPACE_FADE_START_ZOOM - minZoom)));
  return GLOBE_MARKER_MIN_OPACITY + (1 - GLOBE_MARKER_MIN_OPACITY) * progress;
}

export function withSpaceStyle(style: StyleSpecification): StyleSpecification {
  // Cùng một camera nội suy mặt cầu về mặt phẳng, không thay map hay tải lại marker.
  style.projection = {
    type: ["interpolate", ["linear"], ["zoom"], GLOBE_ZOOM, "vertical-perspective", FLAT_MAP_ZOOM, "mercator"],
  };
  style.sky = {
    "sky-color": "transparent",
    "horizon-color": "transparent",
    "fog-color": "transparent",
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], SPACE_FADE_START_ZOOM, 0.2, SPACE_FADE_END_ZOOM, 0],
  };
  style.light = { anchor: "map", position: [1.5, 90, 70] };
  for (const layer of style.layers) {
    // Nhãn được vẽ ở pass riêng của MapLibre; làm mờ trước khi nhìn thấy toàn bộ hành tinh.
    if (layer.type !== "symbol") continue;
    layer.paint ??= {};
    layer.paint["text-opacity"] = ["interpolate", ["linear"], ["zoom"], SPACE_FADE_START_ZOOM, 0, SPACE_FADE_END_ZOOM, 1];
    layer.paint["icon-opacity"] = ["interpolate", ["linear"], ["zoom"], SPACE_FADE_START_ZOOM, 0, SPACE_FADE_END_ZOOM, 1];
  }
  style.sources[SPACE_SOURCE] = {
    type: "raster",
    // Bản 2016 mở theo CC BY 4.0; thứ tự WMTS là z/y/x, khác XYZ thông thường.
    tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"],
    tileSize: 256,
    maxzoom: Math.ceil(SPACE_FADE_END_ZOOM),
    attribution: '<a href="https://cloudless.eox.at">EOxCloudless</a> by <a href="https://maps.eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016)',
  };
  // Phủ ảnh lên basemap và nhãn, nhưng giữ các layer suy nghĩ được thêm sau ở phía trên.
  style.layers.push({
    id: SPACE_LAYER,
    type: "raster",
    source: SPACE_SOURCE,
    maxzoom: SPACE_FADE_END_ZOOM,
    paint: {
      "raster-opacity": ["interpolate", ["linear"], ["zoom"], SPACE_FADE_START_ZOOM, 1, SPACE_FADE_END_ZOOM, 0],
      "raster-fade-duration": 200,
    },
  });
  return style;
}
