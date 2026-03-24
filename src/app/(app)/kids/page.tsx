"use client";

import { useQuery } from "@tanstack/react-query";
import { RecipeImage } from "@/components/recipe-image";
import Link from "next/link";
import { getWeekId, getWeekDates, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string;
  name: string;
  type: string;
  category: string;
  prepTime: number;
  cookTime: number;
  imageUrl: string | null;
}

interface SnackRecipe {
  id: string;
  name: string;
  estimatedCost: string;
}

interface DayPlan {
  dayOfWeek: number;
  date: string;
  type: string | null;
  skipped: boolean;
  recipe: Recipe | null;
  snackRecipe: SnackRecipe | null;
}

interface WeekPlan {
  id: string;
  days: DayPlan[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Montag", "Dienstag", "Mittwoch",
  "Donnerstag", "Freitag", "Samstag", "Sonntag",
];

// One pastel per weekday, Mo–So
const CARD_COLORS = [
  "#FFE8E0", // Mo – warm peach
  "#E8E0F4", // Di – soft lavender
  "#D4E4D5", // Mi – mint
  "#F4EDD4", // Do – warm yellow
  "#D8EAF4", // Fr – sky blue
  "#F4E0F4", // Sa – pink lilac
  "#FFE8CC", // So – apricot
];

// Slightly darker shade for text/border (same hue, more saturated)
const CARD_ACCENT = [
  "#C85D3B", // Mo
  "#7B6BA4", // Di
  "#5A8A5E", // Mi
  "#A07830", // Do
  "#2563EB", // Fr
  "#A855C8", // Sa
  "#D97706", // So
];

// ─── Kids recipe card ─────────────────────────────────────────────────────────

function KidsRecipeCard({ recipe, totalMin }: { recipe: Recipe; totalMin: number }) {
  return (
    <div>
      <RecipeImage
        imageUrl={recipe.imageUrl}
        category={recipe.category}
        height={120}
        style={{ borderRadius: 18, overflow: "hidden", marginBottom: 14 }}
      />
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif", lineHeight: 1.2, marginBottom: totalMin > 0 ? 8 : 0 }}>
        {recipe.name}
      </div>
      {totalMin > 0 && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.65)", borderRadius: 999, padding: "5px 14px", fontSize: "16px", fontWeight: 600, color: "#2D2A26" }}>
          <span>⏰</span>
          <span>{totalMin} Min</span>
        </div>
      )}
    </div>
  );
}


// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchWeekPlan(weekId: string): Promise<WeekPlan | null> {
  const res = await fetch(`/api/week-plans/${weekId}`);
  if (!res.ok) return null;
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KidsPage() {
  const weekId    = getWeekId();
  const weekDates = getWeekDates(weekId);
  const todayStr  = new Date().toDateString();

  const { data: plan, isLoading } = useQuery<WeekPlan | null>({
    queryKey: ["week-plan", weekId],
    queryFn: () => fetchWeekPlan(weekId),
  });

  // Detect today's index (0=Mo … 6=So)
  const todayDayIdx = weekDates.findIndex((d) => d.toDateString() === todayStr);

  // Detect Pizza Sunday
  const sundayPlan = plan?.days?.find((d) => d.dayOfWeek === 6);
  const isPizzaSunday =
    !sundayPlan?.skipped &&
    sundayPlan?.type !== "abendbrot" &&
    sundayPlan?.recipe?.name.toLowerCase().includes("pizza");

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "30px", fontWeight: 700, color: "#2D2A26", margin: 0 }}>
          🍽️ Was gibt's diese Woche?
        </h1>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 120,
              borderRadius: 24,
              background: CARD_COLORS[i],
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  // ── No plan state ────────────────────────────────────────────────────────────
  if (!plan) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", paddingTop: 32 }}>
        <span style={{ fontSize: "80px" }}>😕</span>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "28px", fontWeight: 700, color: "#2D2A26", margin: 0, textAlign: "center" }}>
          Noch kein Plan da!
        </h1>
        <p style={{ fontSize: "18px", color: "#8A8580", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          Mama oder Papa müssen erst den Wochenplan ausfüllen.
        </p>
        <Link
          href="/plan"
          style={{
            padding: "16px 32px",
            background: "#C85D3B",
            color: "#fff",
            borderRadius: 18,
            textDecoration: "none",
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Zum Wochenplan →
        </Link>
      </div>
    );
  }

  // Build a dayOfWeek → DayPlan map
  const dayMap = new Map(plan.days.map((d) => [d.dayOfWeek, d]));

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "28px",
          fontWeight: 700,
          color: "#2D2A26",
          margin: "0 0 4px",
        }}
      >
        🍽️ Was gibt's diese Woche?
      </h1>

      {/* Day cards */}
      {Array.from({ length: 7 }).map((_, i) => {
        const day        = dayMap.get(i);
        const isSkipped  = day?.skipped ?? false;
        const isAbendbrot = !isSkipped && day?.type === "abendbrot";
        const recipe     = (!isSkipped && !isAbendbrot) ? (day?.recipe ?? null) : null;
        const snack      = isAbendbrot ? (day?.snackRecipe ?? null) : null;
        const date       = weekDates[i];
        const isToday    = i === todayDayIdx;
        const bg         = CARD_COLORS[i];
        const accent     = CARD_ACCENT[i];
        const totalMin   = recipe ? recipe.prepTime + recipe.cookTime : 0;

        return (
          <div
            key={i}
            style={{
              borderRadius: 24,
              background: bg,
              border: isToday
                ? `3px solid ${accent}`
                : "2px solid rgba(0,0,0,0.06)",
              padding: "20px 22px",
              position: "relative",
              boxShadow: isToday
                ? `0 4px 20px ${accent}30`
                : "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* "Heute" badge */}
            {isToday && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: accent,
                  color: "#fff",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 800,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                Heute!
              </div>
            )}

            {/* Day name + date */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: accent,
                  fontFamily: "'Fraunces', serif",
                  lineHeight: 1,
                }}
              >
                {DAY_NAMES[i]}
              </div>
              {date && (
                <div style={{ fontSize: "14px", color: "#8A8580", marginTop: 2 }}>
                  {formatDate(date)}
                </div>
              )}
            </div>

            {isAbendbrot ? (
              /* Abendbrot */
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: "64px", lineHeight: 1, flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" }}>
                  🍞
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif", lineHeight: 1.2, marginBottom: snack ? 8 : 0 }}>
                    Abendbrot
                  </div>
                  {snack && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.65)", borderRadius: 999, padding: "5px 14px", fontSize: "16px", fontWeight: 600, color: "#2D2A26" }}>
                      <span>🧀</span>
                      <span>+ {snack.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : recipe ? (
              /* Warmes Gericht */
              <KidsRecipeCard recipe={recipe} totalMin={totalMin} />
            ) : (
              /* Leer / übersprungen */
              <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.6 }}>
                <span style={{ fontSize: "56px", lineHeight: 1 }}>❓</span>
                <span style={{ fontSize: "22px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif" }}>
                  {isSkipped ? "Kein Kochen 😴" : "Noch offen"}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* 🍕 Pizza Sunday highlight */}
      {isPizzaSunday && (
        <div
          style={{
            background: "linear-gradient(135deg, #FFE8CC 0%, #FFF3E0 100%)",
            border: "3px solid #F59E0B",
            borderRadius: 24,
            padding: "22px 22px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(245,158,11,0.25)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: 8 }}>🍕🎉</div>
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "22px",
              fontWeight: 800,
              color: "#92400E",
              margin: "0 0 6px",
              lineHeight: 1.3,
            }}
          >
            Sonntag = Pizza-Tag!
          </p>
          <p
            style={{
              fontSize: "17px",
              color: "#78350F",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Theo & Carlo dürfen selbst belegen 🎉
          </p>
        </div>
      )}

      {/* Bottom spacing helper */}
      <div style={{ height: 4 }} />
    </div>
  );
}
