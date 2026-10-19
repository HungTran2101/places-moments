"use client";

import { GlassButton } from "@/components/ui/glass-button";
import thoughtBubbleImg from "@/public/assets/thought_bubble.png";
import type { Submission } from "@/services/submissions";
import { ArrowLeft, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Dialog } from "radix-ui";
import type { CSSProperties } from "react";

interface ThoughtModalProps {
  open: boolean;
  submission: Submission | null;
  origin: { x: number; y: number } | null;
  onOpenChange: (open: boolean) => void;
  onReturnFocus: () => void;
}

function WeatherIcon({ code }: { code: number }) {
  const props = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (code === 0) return <Sun {...props} />;
  if (code === 1 || code === 2) return <CloudSun {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <Snowflake {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  if (code >= 61 && code <= 82) return <CloudRain {...props} />;
  return <Cloud {...props} />;
}

export default function ThoughtModal({ open, submission, origin, onOpenChange, onReturnFocus }: ThoughtModalProps) {
  const t = useTranslations("popup");
  const weather = useTranslations("weather");


  const weatherKey = submission?.weather_code == null ? "" : String(submission.weather_code);
  // Ưu tiên câu thời tiết theo ngôn ngữ hiện tại; chỉ dùng mô tả từ API khi mã chưa có bản dịch.
  const atmosphere = weatherKey && weather.has(weatherKey)
    ? weather(weatherKey)
    : submission?.weather_summary;

  return (
    <Dialog.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* <Dialog.Overlay className="thoughtModal-overlay" /> */}
        <Dialog.Content
          key={submission?.id}
          className="liquid-glass2 thoughtModal-content"
          style={{
            ...(origin ? {
              "--thought-origin-x": `${origin.x}px`,
              "--thought-origin-y": `${origin.y}px`,
            } : {}),
            '--blur-size': '10px',
          } as CSSProperties}
          // Chỉ chặn thao tác tự đóng của dialog, không chặn sự kiện chuột kéo bản đồ.
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            // Ghim WebGL không có Dialog.Trigger; trả focus về canvas để tiếp tục khám phá bản đồ.
            event.preventDefault();
            if (!open) onReturnFocus();
          }}
        >
          <div className="thoughtModal-header">
            <Image className="thoughtModal-bubble" src={thoughtBubbleImg} alt="" sizes="44px" />
            <Dialog.Title className="thoughtModal-title">{t("title")}</Dialog.Title>
            {/* <Dialog.Close asChild>
              <GlassButton type="button" size="icon" className="thoughtModal-close" aria-label={t("close")}>
                <X aria-hidden="true" />
              </GlassButton>
            </Dialog.Close> */}
          </div>

          <Dialog.Description className="thoughtModal-thought">
            {submission?.description}
          </Dialog.Description>

          <div className="thoughtModal-footer">
            {atmosphere && (
              <p className="thoughtModal-weather">
                <WeatherIcon code={Number(weatherKey || -1)} />
                <span>{atmosphere}</span>
              </p>
            )}
            <Dialog.Close asChild>
              <GlassButton
                type="button"
                className="thoughtModal-return"
              >
                <ArrowLeft aria-hidden="true" />
                {t("backToMap")}
              </GlassButton>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
