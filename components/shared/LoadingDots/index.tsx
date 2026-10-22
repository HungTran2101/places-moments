import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface LoadingDotsProps {
  color?: CSSProperties["color"];
  className?: string;
}

export function LoadingDots({ color, className }: LoadingDotsProps) {
  return (
    <span className={cn("LoadingDots", className)} style={{ color }} aria-hidden="true">
      <span className="LoadingDots-dot" />
      <span className="LoadingDots-dot" />
      <span className="LoadingDots-dot" />
    </span>
  );
}
