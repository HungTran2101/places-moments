import mapStyle from "@/styles/map-style.json";
import type { StyleSpecification } from "maplibre-gl";

export type MapTimeStage = "daytime" | "evening" | "nighttime";
export type MapTimeMode = "auto" | MapTimeStage;

const BASE_STYLE = mapStyle as StyleSpecification;

const PALETTES = {
  evening: {
    land: "#d7c7a6",
    residential: "#6b5b64",
    greenery: "#6b5b64",
    water: "#c2a69d",
    shoreline: "#ccad57",
    road: "#ccad57",
    casing: "#833317",
    rail: "#c1611c",
    building: "#6b5b64",
    buildingTop: "#b69f99",
    boundary: "#c1611c",
    label: "#434152",
    waterLabel: "#8e3719",
  },
  nighttime: {
    land: "#3b4963",
    residential: "#44536d",
    greenery: "#3a5351",
    water: "#141b2c",
    shoreline: "#62728f",
    road: "#697b98",
    casing: "#2d394f",
    rail: "#7c8aa3",
    building: "#465570",
    buildingTop: "#52627e",
    boundary: "#9686a4",
    label: "#d4cee8",
    waterLabel: "#babbd9",
  },
};

export function getMapTimeStage(date: Date): MapTimeStage {
  const hour = date.getHours();
  if (hour >= 6 && hour < 15) return "daytime";
  if (hour >= 15 && hour < 18) return "evening";
  return "nighttime";
}

export function resolveMapTimeStage(mode: MapTimeMode, date: Date): MapTimeStage {
  return mode === "auto" ? getMapTimeStage(date) : mode;
}

function getLayerColor(layerId: string, property: string, palette: typeof PALETTES.evening): string {
  const isWater = /^(water|vn-disputed-islands-label-mask)/.test(layerId);
  if (property === "text-halo-color") return isWater ? palette.water : palette.land;
  if (property === "text-color" || property === "icon-color") {
    return isWater ? palette.waterLabel : palette.label;
  }
  if (property === "background-color") return palette.land;
  if (property === "circle-color") return palette.water;
  if (property === "fill-outline-color") return isWater ? palette.shoreline : palette.building;
  if (isWater) return palette.water;
  if (layerId.startsWith("boundary")) return palette.boundary;
  if (layerId === "building-top") return palette.buildingTop;
  if (layerId === "building") return palette.building;
  if (layerId === "landuse_residential") return palette.residential;
  if (/^(land|park)/.test(layerId)) return palette.greenery;
  if (layerId.includes("rail")) return layerId.endsWith("dash") ? palette.road : palette.rail;
  if (layerId.includes("_case") || layerId.endsWith("_path")) return palette.casing;
  return palette.road;
}

function recolor(value: unknown, color: string): unknown {
  if (typeof value === "string") {
    if (value === "transparent") return value;
    // Giữ alpha gốc để vùng cây xanh, mặt nạ nhãn và chữ ẩn không đổi hành vi.
    const alpha = value.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/)?.[1];
    if (alpha === undefined) return color;
    const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
    return `rgba(${rgb.join(", ")}, ${alpha})`;
  }
  if (value && typeof value === "object" && "stops" in value && Array.isArray(value.stops)) {
    // Chỉ đổi màu trong từng stop, giữ ngưỡng zoom và cách nội suy của basemap.
    return { ...value, stops: value.stops.map(([zoom, stop]: [number, unknown]) => [zoom, recolor(stop, color)]) };
  }
  return value;
}

export function getMapPaintProperties(stage: MapTimeStage) {
  return BASE_STYLE.layers.map((layer) => ({
    layerId: layer.id,
    paint: Object.fromEntries(
      Object.entries(layer.paint ?? {})
        .filter(([property]) => property.endsWith("-color"))
        .map(([property, value]) => [property, stage === "daytime"
          ? structuredClone(value)
          : recolor(value, getLayerColor(layer.id, property, PALETTES[stage]))]),
    ),
  }));
}

export function getTimeMapStyle(stage: MapTimeStage): StyleSpecification {
  const style = structuredClone(BASE_STYLE);
  const paints = getMapPaintProperties(stage);
  style.layers.forEach((layer, index) => {
    Object.assign(layer.paint ??= {}, paints[index].paint);
  });
  return style;
}
