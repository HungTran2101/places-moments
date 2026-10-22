"use client";

import { useEffect, useState } from "react";

interface TextTypingProps {
  text: string;
  /** Thời gian giữa hai ký tự, tính bằng mili giây. */
  speed?: number;
  className?: string;
}

export default function TextTyping({ text, speed = 20, className }: TextTypingProps) {
  const [typed, setTyped] = useState({ source: text, value: "" });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!text || reducedMotion.matches || !Number.isFinite(speed) || speed <= 0) {
      setTyped({ source: text, value: text });
      return;
    }

    // Tách theo ký tự hiển thị để không cắt đôi emoji hoặc dấu tiếng Việt khi gõ.
    const characters = Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      ({ segment }) => segment,
    );
    let index = 0;
    let value = "";
    setTyped({ source: text, value });

    const timer = window.setInterval(() => {
      value += characters[index];
      index += 1;
      setTyped({ source: text, value });
      if (index === characters.length) window.clearInterval(timer);
    }, speed);

    const finishForReducedMotion = () => {
      if (!reducedMotion.matches) return;
      window.clearInterval(timer);
      setTyped({ source: text, value: text });
    };
    reducedMotion.addEventListener("change", finishForReducedMotion);

    return () => {
      // Dừng lượt gõ cũ khi đổi nội dung, tốc độ hoặc tháo component.
      window.clearInterval(timer);
      reducedMotion.removeEventListener("change", finishForReducedMotion);
    };
  }, [text, speed]);

  return (
    <span className={className} style={{ display: "block", position: "relative", whiteSpace: "pre-wrap" }}>
      <span className="visually-hidden">{text}</span>
      {/* Giữ chỗ theo toàn bộ nội dung ngay từ đầu để modal không đổi chiều cao khi gõ. */}
      <span aria-hidden="true" style={{ visibility: "hidden" }}>{text}</span>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        {typed.source === text ? typed.value : ""}
      </span>
    </span>
  );
}
