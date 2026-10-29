import type { Map as MapLibreMap } from "maplibre-gl";

type Direction = [number, number, number];

export type SpaceProjection = ReturnType<typeof createSpaceProjection>;

function rotateX([x, y, z]: Direction, angle: number): Direction {
  return [x, y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle)];
}

function rotateY([x, y, z]: Direction, angle: number): Direction {
  return [x * Math.cos(angle) + z * Math.sin(angle), y, -x * Math.sin(angle) + z * Math.cos(angle)];
}

function rotateZ([x, y, z]: Direction, angle: number): Direction {
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), z];
}

export function createSpaceProjection(map: MapLibreMap, width: number, height: number) {
  const radians = Math.PI / 180;
  const center = map.getCenter();
  const longitude = -center.lng * radians;
  const latitude = center.lat * radians;
  const bearing = map.getBearing() * radians;
  const pitch = -map.getPitch() * radians;
  const roll = map.getRoll() * radians;
  const matrix = map.transform.projectionMatrix;

  // Cùng hệ trục và thứ tự quay của getSunPos trong MapLibre 5.19 draw_sky.ts.
  // Ghép ma trận một lần mỗi camera, tránh tính lượng giác cho từng ngôi sao.
  const axes = ([[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Direction[]).map((axis) => {
    let direction = rotateY(axis, longitude);
    direction = rotateX(direction, latitude);
    direction = rotateZ(direction, bearing);
    direction = rotateX(direction, pitch);
    return rotateZ(direction, roll);
  });
  const clipX = axes.map(([x, y, z]) => matrix[0] * x + matrix[4] * y + matrix[8] * z);
  const clipY = axes.map(([x, y, z]) => matrix[1] * x + matrix[5] * y + matrix[9] * z);
  const clipW = axes.map(([x, y, z]) => matrix[3] * x + matrix[7] * y + matrix[11] * z);

  return {
    focalLength: Math.abs(matrix[5]) * height / 2,
    project({ x, y, z }: { x: number; y: number; z: number }) {
      // Nguồn sáng và sao ở vô cực nên bỏ phép tịnh tiến; chỉ loại phía sau camera.
      const w = clipW[0] * x + clipW[1] * y + clipW[2] * z;
      if (w <= 0) return null;
      return {
        x: (1 + (clipX[0] * x + clipX[1] * y + clipX[2] * z) / w) * width / 2,
        y: (1 - (clipY[0] * x + clipY[1] * y + clipY[2] * z) / w) * height / 2,
      };
    },
  };
}
