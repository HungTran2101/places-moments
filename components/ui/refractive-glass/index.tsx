"use client";

import { Slot } from "radix-ui";
import { useEffect, useId, useState, type ComponentProps, type CSSProperties, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { REFRACTIVE_GLASS_CONFIG } from "./config";
import { createGlassMaps, type GlassMapConfig } from "./maps";

export type RefractiveGlassProps = ComponentProps<typeof Slot.Root> & Partial<GlassMapConfig> & {
  children: ReactElement;
  /**
   * Độ mờ của nền trước khi khúc xạ (px); tăng để mờ hơn, đặt 0 để tắt blur SVG.
   * @defaultValue 2 (REFRACTIVE_GLASS_CONFIG.blur)
   */
  blur?: number;
  /**
   * Độ sáng của nền kính; 1 giữ nguyên, 0.7 tối hơn, 1.3 sáng hơn. Giá trị nhỏ hơn 0 được giới hạn về 0.
   * Chỉ thay đổi nền kính, không đổi độ sáng chữ và biểu tượng.
   * @defaultValue 1 (REFRACTIVE_GLASS_CONFIG.brightness)
   */
  brightness?: number;
};

// Slot giữ nguyên phần tử, ref, sự kiện và bố cục hiện có mà không cần provider.
export function RefractiveGlass({
  children,
  blur = REFRACTIVE_GLASS_CONFIG.blur,
  brightness = REFRACTIVE_GLASS_CONFIG.brightness,
  bezelWidth = REFRACTIVE_GLASS_CONFIG.bezelWidth,
  bezelRadiusRatio = REFRACTIVE_GLASS_CONFIG.bezelRadiusRatio,
  glassThickness = REFRACTIVE_GLASS_CONFIG.glassThickness,
  ...props
}: RefractiveGlassProps) {
  // Chuyển ref và props của Radix Portal xuống DOM để Presence chờ hết animation đóng.
  // Slot ghép ref này với ref đo kích thước của GlassSurface mà không thêm phần tử DOM.
  const surface = <Slot.Root {...props}>{children}</Slot.Root>;
  return (
    <GlassSurface
      blur={blur}
      brightness={brightness}
      bezelWidth={bezelWidth}
      bezelRadiusRatio={bezelRadiusRatio}
      glassThickness={glassThickness}
    >
      {surface}
    </GlassSurface>
  );
}

function GlassSurface({ children, blur, brightness, bezelWidth, bezelRadiusRatio, glassThickness }: { children: ReactElement; blur: number; brightness: number } & GlassMapConfig) {
  const id = `refraction-${useId().replace(/:/g, "")}`;
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [maps, setMaps] = useState<ReturnType<typeof createGlassMaps>>(null);

  useEffect(() => {
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // CSS.supports chỉ kiểm tra cú pháp URL, không chứng minh trình duyệt có khúc xạ nền.
    // Giới hạn tăng cường này cho Chromium; Safari/Firefox vẫn có lớp kính mờ và viền sáng.
    const chromium = /Chrome|Chromium|Edg|OPR/.test(navigator.userAgent) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!chromium || !window.CSS?.supports("backdrop-filter", 'url("#refraction-support")')) return;

    let frame = 0;
    let lastSize = "";
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (reducedMotion.matches) {
          lastSize = "";
          setMaps(null);
          return;
        }
        // offsetWidth/Height bỏ qua transform khi sidebar/modal đang phóng hoặc thu.
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        if (!width || !height) return;
        const value = getComputedStyle(element).borderTopLeftRadius;
        const radius = Math.min(parseFloat(value) * (value.endsWith("%") ? Math.min(width, height) / 100 : 1) || 0, width / 2, height / 2);
        const key = `${width}:${height}:${radius}`;
        if (key === lastSize) return;
        lastSize = key;
        try {
          setMaps(createGlassMaps(width, height, radius, { bezelWidth, bezelRadiusRatio, glassThickness }));
        } catch {
          // Canvas có thể bị tắt bởi trình duyệt; giữ lớp fallback để nội dung vẫn đọc được.
          setMaps(null);
        }
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    reducedMotion.addEventListener("change", update);
    update();

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", update);
      cancelAnimationFrame(frame);
    };
  }, [element, bezelWidth, bezelRadiusRatio, glassThickness]);

  return (
    <>
      <Slot.Root
        ref={setElement}
        // Dùng nguyên phương thức liquid-glass2 khi chưa có SVG, không hỗ trợ hoặc giảm chuyển động.
        className={maps ? undefined : "liquid-glass2"}
        data-refractive-glass={maps ? "active" : "fallback"}
        style={{ "--refraction-filter": maps ? `url("#${id}") brightness(${Math.max(0, brightness)})` : undefined } as CSSProperties}
      >
        {children}
      </Slot.Root>
      {element && maps && createPortal(
        <svg className="refraction-definitions" width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <filter id={id} x="0" y="0" width={maps.width} height={maps.height} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="softened" />
              <feImage href={maps.displacementUrl} width={maps.width} height={maps.height} preserveAspectRatio="none" result="displacement" />
              <feDisplacementMap in="softened" in2="displacement" scale={maps.scale} xChannelSelector="R" yChannelSelector="G" result="refracted" />
              <feImage href={maps.highlightUrl} width={maps.width} height={maps.height} preserveAspectRatio="none" result="highlight" />
              <feBlend in="highlight" in2="refracted" mode="screen" />
            </filter>
          </defs>
        </svg>,
        element.ownerDocument.body,
      )}
    </>
  );
}
