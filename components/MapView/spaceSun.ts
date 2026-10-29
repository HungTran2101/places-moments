import type { SpaceProjection } from "./spaceProjection";
import { SPACE_LIGHT_POSITION } from "./spaceStyle";

export function drawSpaceSun(context: CanvasRenderingContext2D, width: number, height: number, camera: SpaceProjection) {
  const radians = Math.PI / 180;
  const [, azimuth, polar] = SPACE_LIGHT_POSITION;
  const azimuthAngle = (azimuth + 90) * radians;
  const polarAngle = polar * radians;
  // Cùng sphericalToCartesian của MapLibre; camera dùng chung phép chiếu với nền sao.
  // Bỏ khoảng cách vì Mặt Trời là nguồn sáng ở vô cực, chỉ hướng quyết định vị trí trên trời.
  const position = camera.project({
    x: -Math.cos(azimuthAngle) * Math.sin(polarAngle),
    y: -Math.sin(azimuthAngle) * Math.sin(polarAngle),
    z: -Math.cos(polarAngle),
  });
  if (!position) return;
  const { x, y } = position;
  const radius = Math.max(3.5, camera.focalLength * 0.005);
  const haloRadius = radius * 14;
  if (x < -haloRadius || x > width + haloRadius || y < -haloRadius || y > height + haloRadius) return;

  context.save();
  const glow = context.createRadialGradient(x, y, 0, x, y, haloRadius);
  // Một đường suy giảm ánh sáng liên tục từ lõi trắng đến quầng ấm, không vẽ đĩa có mép riêng.
  // Lấy mẫu dày và làm phẳng đuôi để gradient không lộ vòng sáng hay ranh giới ngoài.
  const samples = 192;
  for (let index = 0; index <= samples; index++) {
    const progress = index / samples;
    const distance = progress * haloRadius / radius;
    // Lõi giảm sáng nhanh hơn ở mép, giữ nguyên các thành phần quầng sáng phía ngoài.
    const radiance = 10 * Math.exp(-4 * Math.pow(distance, 4))
      + 0.75 * Math.exp(-1.2 * distance)
      + 0.85 * Math.exp(-0.4 * distance)
      + 0.14 * Math.exp(-0.12 * distance);
    const alpha = (1 - Math.exp(-radiance)) * Math.pow(1 - progress * progress, 2);
    const warmth = 1 - Math.exp(-0.32 * distance);
    glow.addColorStop(progress, `rgba(255,${Math.round(255 - 105 * warmth)},${Math.round(250 - 140 * warmth)},${alpha})`);
  }
  context.fillStyle = glow;
  context.fillRect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
  context.restore();
}
