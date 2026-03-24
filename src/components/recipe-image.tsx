"use client";

import { useState } from "react";
import NextImage from "next/image";
import { UtensilsCrossed, Fish, Salad, Utensils, Sandwich } from "lucide-react";
import type { LucideProps } from "lucide-react";

// ─── Per-category placeholder config ──────────────────────────────────────────

type CatCfg = { bg: string; color: string; Icon: React.FC<LucideProps> };

const CAT: Record<string, CatCfg> = {
  fleisch:     { bg: "#FEF3EE", color: "#C84B2B", Icon: UtensilsCrossed },
  fisch:       { bg: "#EFF6FF", color: "#1E40AF", Icon: Fish },
  vegetarisch: { bg: "#F0FDF4", color: "#14532D", Icon: Salad },
  abendbrot:   { bg: "#F5F3FF", color: "#4C1D95", Icon: Utensils },
  snack:       { bg: "#FFFBEB", color: "#92400E", Icon: Sandwich },
};
const DEFAULT_CFG: CatCfg = { bg: "#FAF6F1", color: "#8A8580", Icon: UtensilsCrossed };

/** Only Supabase Storage URLs go through next/image (whitelisted in next.config.ts). */
function isSupabaseUrl(url: string) {
  return url.includes(".supabase.co");
}

function Placeholder({ category, height }: { category: string; height: number }) {
  const { bg, color, Icon } = CAT[category] ?? DEFAULT_CFG;
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={Math.round(height * 0.38)} color={color} strokeWidth={1.2} />
    </div>
  );
}

// ─── RecipeImage: skeleton → image → placeholder fallback ────────────────────

interface RecipeImageProps {
  imageUrl?: string | null;
  category: string;
  height: number;
  style?: React.CSSProperties;
}

export function RecipeImage({ imageUrl, category, height, style }: RecipeImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    imageUrl ? "loading" : "error"
  );

  const showImage = imageUrl && status !== "error";
  const useNextImage = imageUrl ? isSupabaseUrl(imageUrl) : false;

  return (
    <div style={{ position: "relative", height, flexShrink: 0, ...style }}>
      {/* Skeleton — shown while loading */}
      {status === "loading" && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #F5EDE6 25%, #FAF0E8 50%, #F5EDE6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Placeholder — shown on error or no URL */}
      {status === "error" && <Placeholder category={category} height={height} />}

      {/* Image — use next/image only for Supabase URLs, plain <img> otherwise */}
      {showImage && (
        useNextImage ? (
          <NextImage
            src={imageUrl!}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            style={{
              objectFit: "cover",
              opacity: status === "loaded" ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl!}
            alt=""
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: status === "loaded" ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        )
      )}

      {/* Shimmer keyframe */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ─── RecipeThumb: small circular/rounded thumbnail ───────────────────────────

interface RecipeThumbProps {
  imageUrl?: string | null;
  category: string;
  size: number;
  borderRadius?: number | string;
}

export function RecipeThumb({ imageUrl, category, size, borderRadius = "50%" }: RecipeThumbProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    imageUrl ? "loading" : "error"
  );
  const { bg, color, Icon } = CAT[category] ?? DEFAULT_CFG;
  const useNextImage = imageUrl ? isSupabaseUrl(imageUrl) : false;

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius,
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Always render icon as fallback layer */}
      <Icon size={Math.round(size * 0.45)} color={color} strokeWidth={1.4} />

      {/* Image fades in on top */}
      {imageUrl && status !== "error" && (
        useNextImage ? (
          <NextImage
            src={imageUrl}
            alt=""
            fill
            sizes={`${size}px`}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            style={{
              objectFit: "cover",
              opacity: status === "loaded" ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: status === "loaded" ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        )
      )}
    </div>
  );
}
