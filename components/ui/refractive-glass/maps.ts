import { REFRACTIVE_GLASS_CONFIG } from "./config";

export interface GlassMapConfig {
  /**
   * Bề rộng tối đa của vùng bẻ cong nền tính từ mép kính vào trong (px).
   * @defaultValue 25 (REFRACTIVE_GLASS_CONFIG.bezelWidth)
   */
  bezelWidth: number;
  /**
   * Giới hạn bề rộng vùng khúc xạ theo bán kính bo góc: min(bezelWidth, bán kính × tỷ lệ).
   * Tăng để vùng khúc xạ rộng hơn, trong giới hạn bezelWidth.
   * @defaultValue 2 (REFRACTIVE_GLASS_CONFIG.bezelRadiusRatio)
   */
  bezelRadiusRatio: number;
  /**
   * Độ dày kính mô phỏng (px); tăng để nền dịch chuyển mạnh hơn, tối đa đến maxDisplacement.
   * @defaultValue 100 (REFRACTIVE_GLASS_CONFIG.glassThickness)
   */
  glassThickness: number;
}

// Dựa trên mô hình khúc xạ của https://kube.io/blog/liquid-glass-css-svg/.
// Chỉ tạo lại khi kích thước hoặc cấu hình kính đổi, không tính theo từng khung hình của bản đồ.
export function createGlassMaps(
  width: number,
  height: number,
  radius: number,
  { bezelWidth, bezelRadiusRatio, glassThickness }: GlassMapConfig = REFRACTIVE_GLASS_CONFIG,
) {
  const ratio = Math.min(1, Math.sqrt(260_000 / (width * height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return null;

  const displacement = context.createImageData(canvas.width, canvas.height);
  const highlight = context.createImageData(canvas.width, canvas.height);
  const bezel = Math.max(1, Math.min(bezelWidth, radius * bezelRadiusRatio));
  const thickness = glassThickness;
  const index = REFRACTIVE_GLASS_CONFIG.refractiveIndex;
  const samples = 128;
  const profile = (position: number) => Math.pow(1 - Math.pow(1 - position, 4), 0.25);
  const magnitudes = Array.from({ length: samples }, (_, i) => {
    const position = (i + 0.5) / samples;
    const slope = (profile(Math.min(1, position + 0.001)) - profile(Math.max(0, position - 0.001))) / 0.002;
    const normalLength = Math.hypot(slope, 1);
    const incidentCosine = 1 / normalLength;
    const refractedCosine = Math.sqrt(1 - (1 - incidentCosine ** 2) / index ** 2);
    const factor = incidentCosine / index - refractedCosine;
    const rayX = factor * -slope / normalLength;
    const rayY = -1 / index + factor / normalLength;
    return Math.abs(rayX / rayY) * (thickness + profile(position) * bezel);
  });
  const maximum = Math.max(1, ...magnitudes);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const px = (x + 0.5) * width / canvas.width - width / 2;
      const py = (y + 0.5) * height / canvas.height - height / 2;
      const qx = Math.abs(px) - (width / 2 - radius);
      const qy = Math.abs(py) - (height / 2 - radius);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const length = Math.hypot(ox, oy);
      const distance = radius - length - Math.min(Math.max(qx, qy), 0);
      const offset = (y * canvas.width + x) * 4;
      displacement.data.set([128, 128, 128, 255], offset);
      if (distance < 0 || distance >= bezel) continue;

      // Pháp tuyến của hình chữ nhật bo góc giữ phần giữa phẳng và chỉ bẻ nền ở viền.
      const nx = length > 0 ? Math.sign(px) * ox / length : qx > qy ? Math.sign(px) : 0;
      const ny = length > 0 ? Math.sign(py) * oy / length : qx > qy ? 0 : Math.sign(py);
      const sample = Math.min(samples - 1, Math.floor(distance / bezel * samples));
      const magnitude = magnitudes[sample] / maximum;
      displacement.data[offset] = Math.round(128 - nx * magnitude * 127);
      displacement.data[offset + 1] = Math.round(128 - ny * magnitude * 127);

      const light = Math.max(0, nx * -0.5 + ny * -0.866);
      const rim = Math.pow(1 - distance / bezel, 3);
      highlight.data.set([255, 255, 255, Math.round((0.06 + light ** 4 * 0.5) * rim * 255)], offset);
    }
  }

  context.putImageData(displacement, 0, 0);
  const displacementUrl = canvas.toDataURL();
  context.putImageData(highlight, 0, 0);
  return {
    width,
    height,
    displacementUrl,
    highlightUrl: canvas.toDataURL(),
    // SVG dùng scale * (channel - 0.5), nên biên độ thực bằng một nửa scale.
    scale: 2 * Math.min(maximum, REFRACTIVE_GLASS_CONFIG.maxDisplacement),
  };
}
