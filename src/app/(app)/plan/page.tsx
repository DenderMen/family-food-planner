"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWeekId, getWeekDates, formatEuro, formatDate } from "@/lib/utils";
import type { SyncResponse } from "@/app/api/calendar/sync/route";
import type { SnackRecipe } from "@/app/api/snacks/route";
import { RecipeThumb } from "@/components/recipe-image";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealCategory = "fleisch" | "fisch" | "vegetarisch" | "abendbrot" | "snack";

interface Recipe {
  id: string;
  name: string;
  type: string;           // "abendessen" | "abendbrot"
  category: MealCategory;
  estimatedCost: string;
  isFavorite: boolean;
  prepTime: number;
  cookTime: number;
  imageUrl: string | null;
}

interface DayPlan {
  id: string | null;
  dayOfWeek: number;      // 0 = Mo, 6 = So
  date: string;           // "2026-03-23"
  recipeId: string | null;
  snackRecipeId: string | null;
  type: string | null;
  skipped: boolean;
  estimatedCost: string;
  recipe: Recipe | null;
  snackRecipe: Recipe | null;
}

interface WeekPlan {
  id: string;
  weekId: string;
  year: number;
  weekNumber: number;
  days: DayPlan[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET = 150;

const DAYS = [
  { short: "Mo", long: "Montag" },
  { short: "Di", long: "Dienstag" },
  { short: "Mi", long: "Mittwoch" },
  { short: "Do", long: "Donnerstag" },
  { short: "Fr", long: "Freitag" },
  { short: "Sa", long: "Samstag" },
  { short: "So", long: "Sonntag" },
];

const CAT: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  fleisch:     { label: "Fleisch",     emoji: "🥩", color: "#9A3412", bg: "#FEF3EE", border: "#FDBA99" },
  fisch:       { label: "Fisch",       emoji: "🐟", color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
  vegetarisch: { label: "Vegetarisch", emoji: "🥦", color: "#14532D", bg: "#F0FDF4", border: "#BBF7D0" },
  abendbrot:   { label: "Abendbrot",   emoji: "🍞", color: "#4C1D95", bg: "#F5F3FF", border: "#DDD6FE" },
  snack:       { label: "Snack",       emoji: "🧀", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
};

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  abendessen: { label: "Abendessen", color: "#92400E", bg: "#FFFBEB" },
  abendbrot:  { label: "Abendbrot",  color: "#4C1D95", bg: "#F5F3FF" },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchWeekPlan(weekId: string): Promise<WeekPlan> {
  const res = await fetch(`/api/week-plans/${weekId}`);
  if (!res.ok) throw new Error("Fehler beim Laden des Wochenplans");
  return res.json();
}

async function fetchRecipes(): Promise<Recipe[]> {
  const res = await fetch("/api/recipes");
  if (!res.ok) throw new Error("Fehler beim Laden der Rezepte");
  return res.json();
}

async function putWeekPlan(weekId: string, days: DayPlan[]): Promise<WeekPlan> {
  const res = await fetch(`/api/week-plans/${weekId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw new Error("Fehler beim Speichern");
  return res.json();
}

async function fetchRandomSnacks(count = 4): Promise<SnackRecipe[]> {
  const res = await fetch(`/api/snacks?count=${count}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.snacks ?? [];
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

function offsetWeek(weekId: string, delta: number): string {
  const [y, w] = weekId.split("-W").map(Number);
  let week = w + delta;
  let year = y;
  if (week < 1)  { year--; week = 52; }
  if (week > 52) { year++; week = 1; }
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(weekId: string): string {
  const [, w] = weekId.split("-W");
  return `KW ${w}`;
}

// ─── Snack Modal ──────────────────────────────────────────────────────────────

interface SnackModalProps {
  onSelect: (snack: SnackRecipe) => void;
  onSkip: () => void;
  onClose: () => void;
}

function SnackModal({ onSelect, onSkip, onClose }: SnackModalProps) {
  const [snacks, setSnacks] = useState<SnackRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const results = await fetchRandomSnacks(4);
    setSnacks(results);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(45,42,38,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 640,
          background: "#FAF6F1",
          borderRadius: "20px 20px 0 0",
          padding: "20px 18px 32px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif" }}>
              🧀 Highlight zur Brotzeit
            </div>
            <div style={{ fontSize: "12px", color: "#8A8580", marginTop: 2 }}>
              Kleines Extra zum Abendbrot wählen
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8E2DA", border: "none", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 72, background: "#F5EDE6", borderRadius: 14, opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        )}

        {/* No snacks seeded yet */}
        {!loading && snacks.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#8A8580", fontSize: "14px" }}>
            Noch keine Snacks in der Datenbank.<br/>
            Gehe zu Rezepte → Seed ausführen.
          </div>
        )}

        {/* Snack cards */}
        {!loading && snacks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {snacks.map((snack) => (
              <button
                key={snack.id}
                onClick={() => onSelect(snack)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#fff", border: "1px solid #E8E2DA",
                  borderRadius: 14, padding: "12px 14px",
                  cursor: "pointer", textAlign: "left",
                  boxShadow: "0 1px 3px rgba(45,42,38,0.06)",
                  transition: "border-color 0.15s",
                }}
              >
                <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>🧀</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#2D2A26" }}>{snack.name}</div>
                  <div style={{ fontSize: "12px", color: "#8A8580", marginTop: 2 }}>
                    {snack.prepTime} Min · {formatEuro(parseFloat(snack.estimatedCost))}
                  </div>
                </div>
                <span style={{ fontSize: "18px", color: "#C85D3B", flexShrink: 0 }}>+</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!loading && (
            <button
              onClick={load}
              style={{
                padding: "11px", background: "#fff", border: "1px solid #E8E2DA",
                borderRadius: 12, fontSize: "14px", color: "#2D2A26",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              🔄 Andere Vorschläge
            </button>
          )}
          <button
            onClick={onSkip}
            style={{
              padding: "11px", background: "#FAF6F1", border: "1px solid #E8E2DA",
              borderRadius: 12, fontSize: "13px", color: "#8A8580",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Ohne Highlight weitermachen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const queryClient = useQueryClient();
  const [weekId, setWeekId]   = useState(() => getWeekId());
  const [localDays, setLocal] = useState<DayPlan[]>([]);
  const [dirty, setDirty]     = useState(false);
  const [saved, setSaved]     = useState(false);
  const [snackModal, setSnackModal] = useState<{ dayOfWeek: number } | null>(null);
  const [syncState, setSyncState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; result: SyncResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const currentWeekId = getWeekId();
  const isCurrentWeek = weekId === currentWeekId;
  const weekDates     = getWeekDates(weekId);
  const todayStr      = new Date().toDateString();
  const [yearStr, wStr] = weekId.split("-W");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ["week-plan", weekId],
    queryFn: () => fetchWeekPlan(weekId),
    staleTime: 60 * 1000,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: fetchRecipes,
  });

  // Group recipes for faster lookup (exclude snacks from main selector)
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const mainRecipes = recipes.filter((r) => r.category !== "snack");
  const favorites   = mainRecipes.filter((r) => r.isFavorite);
  const rest        = mainRecipes.filter((r) => !r.isFavorite);

  // Sync server state → local
  useEffect(() => {
    if (plan?.days) {
      setLocal(plan.days.map((d) => ({
        ...d,
        snackRecipeId: (d as DayPlan).snackRecipeId ?? null,
        snackRecipe: (d as DayPlan).snackRecipe ?? null,
      })));
      setDirty(false);
    }
  }, [plan]);

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () => putWeekPlan(weekId, localDays),
    onSuccess: (data) => {
      queryClient.setQueryData(["week-plan", weekId], data);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  // ── Day update helpers ────────────────────────────────────────────────────────

  const setDay = useCallback((dayOfWeek: number, patch: Partial<DayPlan>) => {
    setLocal((prev) =>
      prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)
    );
    setDirty(true);
    setSaved(false);
  }, []);

  function selectRecipe(dayOfWeek: number, recipeId: string | null) {
    const recipe = recipeId ? (recipeMap.get(recipeId) ?? null) : null;
    setDay(dayOfWeek, {
      recipeId,
      recipe,
      type: "abendessen",
      estimatedCost: recipe?.estimatedCost ?? "0",
      skipped: false,
    });
  }

  function selectType(dayOfWeek: number, mealType: "abendessen" | "abendbrot") {
    if (mealType === "abendbrot") {
      setDay(dayOfWeek, {
        type: "abendbrot",
        recipeId: null,
        recipe: null,
        snackRecipeId: null,
        snackRecipe: null,
        estimatedCost: "6.00",
      });
      setSnackModal({ dayOfWeek });
    } else {
      setDay(dayOfWeek, {
        type: "abendessen",
        recipeId: null,
        recipe: null,
        snackRecipeId: null,
        snackRecipe: null,
        estimatedCost: "0",
      });
    }
  }

  function selectSnack(dayOfWeek: number, snack: SnackRecipe | null) {
    if (!snack) {
      setDay(dayOfWeek, { snackRecipeId: null, snackRecipe: null, estimatedCost: "0" });
      return;
    }
    // Build a minimal Recipe from SnackRecipe
    const snackAsRecipe: Recipe = {
      id: snack.id,
      name: snack.name,
      type: "abendbrot",
      category: "snack",
      estimatedCost: snack.estimatedCost,
      isFavorite: false,
      prepTime: snack.prepTime,
      cookTime: 0,
      imageUrl: null,
    };
    setDay(dayOfWeek, { snackRecipeId: snack.id, snackRecipe: snackAsRecipe, estimatedCost: snack.estimatedCost });
  }

  function toggleSkip(dayOfWeek: number) {
    const day = localDays.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day) return;
    if (day.skipped) {
      setDay(dayOfWeek, { skipped: false });
    } else {
      setDay(dayOfWeek, {
        skipped: true,
        recipeId: null,
        recipe: null,
        snackRecipeId: null,
        snackRecipe: null,
        type: null,
        estimatedCost: "0",
      });
    }
  }

  // ── Calendar sync ─────────────────────────────────────────────────────────────

  async function handleCalendarSync() {
    setSyncState({ status: "loading" });
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Sync");
      setSyncState({ status: "success", result: data as SyncResponse });
      setTimeout(() => setSyncState({ status: "idle" }), 5000);
    } catch (err) {
      setSyncState({ status: "error", message: err instanceof Error ? err.message : "Fehler" });
      setTimeout(() => setSyncState({ status: "idle" }), 5000);
    }
  }

  // ── Derived budget + stats ────────────────────────────────────────────────────

  const totalCost = localDays.reduce(
    (s, d) => s + (d.skipped ? 0 : parseFloat(d.estimatedCost || "0")), 0
  );
  const remaining  = BUDGET - totalCost;
  const pct        = Math.min((totalCost / BUDGET) * 100, 100);
  const overBudget = totalCost > BUDGET;
  const barColor   = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#5A8A5E";

  const abendBrotCount = localDays.filter((d) => !d.skipped && d.type === "abendbrot").length;

  const catCounts = localDays.reduce((acc, d) => {
    if (!d.skipped && d.type === "abendbrot") {
      acc["abendbrot"] = (acc["abendbrot"] ?? 0) + 1;
    } else if (!d.skipped && d.recipe?.category) {
      const c = d.recipe.category as string;
      if (c !== "snack") acc[c] = (acc[c] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalMeals = Object.values(catCounts).reduce((s, n) => s + n, 0);

  // ── Styles ───────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E8E2DA",
    boxShadow: "0 1px 4px rgba(45,42,38,0.06)",
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Snack modal */}
      {snackModal && (
        <SnackModal
          onSelect={(snack) => {
            selectSnack(snackModal.dayOfWeek, snack);
            setSnackModal(null);
          }}
          onSkip={() => {
            selectSnack(snackModal.dayOfWeek, null);
            setSnackModal(null);
          }}
          onClose={() => setSnackModal(null)}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", fontWeight: 600, color: "#2D2A26", margin: 0 }}>
          Wochenplan
        </h1>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setWeekId(offsetWeek(weekId, -1))}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #E8E2DA", background: "#fff", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#2D2A26" }}
          >‹</button>

          <div style={{ textAlign: "center", minWidth: 64 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: isCurrentWeek ? "#C85D3B" : "#2D2A26" }}>
              {weekLabel(weekId)}
            </div>
            <div style={{ fontSize: "11px", color: "#8A8580" }}>{yearStr}</div>
          </div>

          <button
            onClick={() => setWeekId(offsetWeek(weekId, 1))}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #E8E2DA", background: "#fff", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#2D2A26" }}
          >›</button>
        </div>
      </div>

      {/* "Neue KW" button when not on current week */}
      {!isCurrentWeek && (
        <button
          onClick={() => setWeekId(currentWeekId)}
          style={{ padding: "12px 16px", background: "#C85D3B", color: "#fff", border: "none", borderRadius: 14, fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 3px 10px rgba(200,93,59,0.3)" }}
        >
          <span>+</span> Neuen Wochenplan erstellen ({weekLabel(currentWeekId)})
        </button>
      )}

      {/* ── Budget bar ────────────────────────────────────────────── */}
      <div style={{ ...card, padding: "16px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: "12px", color: "#8A8580", marginBottom: 2 }}>
              Budget {weekLabel(weekId)} · {yearStr}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'Fraunces', serif", color: overBudget ? "#EF4444" : "#2D2A26" }}>
              {formatEuro(totalCost)}
              <span style={{ fontSize: "14px", fontWeight: 400, color: "#8A8580" }}> von {formatEuro(BUDGET)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {overBudget ? (
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#EF4444" }}>
                {formatEuro(Math.abs(remaining))} überzogen!
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#5A8A5E", fontWeight: 600 }}>
                {formatEuro(remaining)} übrig
              </div>
            )}
            <div style={{ fontSize: "11px", color: "#8A8580" }}>
              {totalMeals} von 7 geplant
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 10, background: "#F5EDE6", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999, transition: "width 0.4s ease, background 0.25s" }}
          />
        </div>

        {/* Tick marks */}
        <div style={{ position: "relative", height: 12, marginTop: 2 }}>
          {[70, 90].map((mark) => (
            <div key={mark} style={{ position: "absolute", left: `${mark}%`, top: 0, fontSize: "9px", color: "#E8D5C8", transform: "translateX(-50%)" }}>
              {mark}%
            </div>
          ))}
        </div>

        {/* Stats pills */}
        {totalMeals > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {(["fleisch", "fisch", "vegetarisch", "abendbrot"] as const).map((key) => {
              const cfg = CAT[key];
              const count = catCounts[key] ?? 0;
              if (!count) return null;
              return (
                <span
                  key={key}
                  style={{ fontSize: "12px", padding: "4px 10px", borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600 }}
                >
                  {cfg.emoji} {cfg.label} {count}×
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {(["fleisch", "fisch", "vegetarisch", "abendbrot"] as const).map((key) => {
          const cfg = CAT[key];
          return (
            <div key={key} style={{ ...card, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "20px" }}>{cfg.emoji}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'Fraunces', serif", color: catCounts[key] ? cfg.color : "#E8E2DA", marginTop: 4 }}>
                {catCounts[key] ?? 0}
              </div>
              <div style={{ fontSize: "10px", color: "#8A8580", marginTop: 2, lineHeight: 1.2 }}>
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Day cards ─────────────────────────────────────────────── */}
      {planLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 84, background: "#F5EDE6", borderRadius: 16, opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      )}

      {planError && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 14, padding: "14px 16px", fontSize: "14px", color: "#991B1B" }}>
          Fehler beim Laden des Wochenplans.
        </div>
      )}

      {!planLoading && !planError && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {localDays.map((day, i) => {
            const date    = weekDates[i];
            const isToday = date?.toDateString() === todayStr;
            const cat     = day.recipe ? CAT[day.recipe.category] : null;
            const typeCfg = day.type ? TYPE_BADGE[day.type] : null;

            return (
              <DayCard
                key={day.dayOfWeek}
                day={day}
                dayLabel={DAYS[i]}
                date={date}
                isToday={isToday}
                cat={cat}
                typeCfg={typeCfg}
                favorites={favorites}
                rest={rest}
                abendBrotCount={abendBrotCount}
                onSelectType={selectType}
                onSelectRecipe={selectRecipe}
                onToggleSkip={toggleSkip}
                onSetCost={(dow, cost) => setDay(dow, { estimatedCost: cost })}
                onEditSnack={() => setSnackModal({ dayOfWeek: day.dayOfWeek })}
                onRemoveSnack={() => selectSnack(day.dayOfWeek, null)}
              />
            );
          })}
        </div>
      )}

      {/* ── Save button ───────────────────────────────────────────── */}
      {(dirty || saved) && (
        <div style={{ position: "sticky", bottom: 80, zIndex: 10 }}>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || saved}
            style={{
              width: "100%",
              padding: "16px",
              background: saved ? "#5A8A5E" : saveMut.isPending ? "#E8D5C8" : "#C85D3B",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              fontSize: "16px",
              fontWeight: 700,
              cursor: saveMut.isPending || saved ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: saved ? "0 4px 16px rgba(90,138,94,0.35)" : "0 4px 16px rgba(200,93,59,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.25s",
            }}
          >
            {saved
              ? "✓ Gespeichert!"
              : saveMut.isPending
              ? "Wird gespeichert…"
              : `Wochenplan speichern · ${formatEuro(totalCost)}`}
          </button>
        </div>
      )}

      {/* ── Calendar export button ────────────────────────────────── */}
      {!dirty && totalMeals > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleCalendarSync}
            disabled={syncState.status === "loading"}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: syncState.status === "success" ? "#5A8A5E" : "#4285F4",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: "15px",
              fontWeight: 600,
              cursor: syncState.status === "loading" ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: syncState.status === "loading" ? 0.7 : 1,
              boxShadow: "0 3px 10px rgba(66,133,244,0.25)",
              transition: "background 0.25s, opacity 0.2s",
            }}
          >
            {syncState.status === "loading"
              ? "⏳ Wird in Kalender eingetragen…"
              : syncState.status === "success"
              ? `✅ ${syncState.result.created} Ereignisse erstellt!`
              : "📅 In Google Kalender exportieren"}
          </button>

          {syncState.status === "error" && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: "13px", color: "#991B1B" }}>
              ❌ {syncState.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DayCard sub-component ────────────────────────────────────────────────────

interface DayCardProps {
  day: DayPlan;
  dayLabel: { short: string; long: string };
  date: Date | undefined;
  isToday: boolean;
  cat: typeof CAT.fleisch | null;
  typeCfg: typeof TYPE_BADGE.warm | null;
  favorites: Recipe[];
  rest: Recipe[];
  abendBrotCount: number;
  onSelectType: (dayOfWeek: number, type: "abendessen" | "abendbrot") => void;
  onSelectRecipe: (dayOfWeek: number, recipeId: string | null) => void;
  onToggleSkip: (dayOfWeek: number) => void;
  onSetCost: (dayOfWeek: number, cost: string) => void;
  onEditSnack: () => void;
  onRemoveSnack: () => void;
}

function DayCard({ day, dayLabel, date, isToday, cat, typeCfg, favorites, rest, abendBrotCount, onSelectType, onSelectRecipe, onToggleSkip, onSetCost, onEditSnack, onRemoveSnack }: DayCardProps) {
  const isAbendbrot = day.type === "abendbrot";
  const abendBrotFull = abendBrotCount >= 2 && !isAbendbrot;

  return (
    <div
      style={{
        background: day.skipped ? "#FAFAFA" : !day.recipeId ? "#FDFAF7" : "#fff",
        borderRadius: 16,
        border: day.skipped
          ? "1px solid #E8E2DA"
          : isToday
          ? "1px solid #C85D3B"
          : !day.recipeId
          ? "1.5px dashed #D4C8BD"
          : "1px solid #E8E2DA",
        boxShadow: isToday && !day.skipped ? "0 0 0 2px rgba(200,93,59,0.12)" : "0 1px 4px rgba(45,42,38,0.06)",
        overflow: "hidden",
        opacity: day.skipped ? 0.65 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Day header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 8px",
          borderBottom: "1px solid #F5EDE6",
          background: isToday ? "rgba(200,93,59,0.04)" : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Day pill */}
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: isToday ? "#C85D3B" : "#F5EDE6",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: isToday ? "#fff" : "#2D2A26", lineHeight: 1 }}>
              {dayLabel.short}
            </span>
            {date && (
              <span style={{ fontSize: "9px", color: isToday ? "rgba(255,255,255,0.75)" : "#8A8580", lineHeight: 1, marginTop: 1 }}>
                {formatDate(date)}
              </span>
            )}
          </div>

          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#2D2A26" }}>{dayLabel.long}</div>
            {isToday && (
              <span style={{ fontSize: "10px", color: "#C85D3B", fontWeight: 600 }}>Heute</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Cost */}
          {!day.skipped && (day.recipeId || day.type === "abendbrot") && parseFloat(day.estimatedCost || "0") > 0 && (
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D2A26" }}>
              {formatEuro(parseFloat(day.estimatedCost || "0"))}
            </span>
          )}

          {/* Skip toggle */}
          <button
            onClick={() => onToggleSkip(day.dayOfWeek)}
            title={day.skipped ? "Wieder aktivieren" : "Auswärts essen"}
            style={{
              padding: "4px 10px", borderRadius: 8,
              border: `1px solid ${day.skipped ? "#BBF7D0" : "#E8E2DA"}`,
              background: day.skipped ? "#F0FDF4" : "#FAF6F1",
              color: day.skipped ? "#14532D" : "#8A8580",
              fontSize: "11px", fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {day.skipped ? "✓ Auswärts" : "Auswärts Essen"}
          </button>
        </div>
      </div>

      {/* Body */}
      {!day.skipped && (
        <div style={{ padding: "10px 14px 12px" }}>

          {/* ── Typ-Auswahl (noch kein Typ gesetzt) ── */}
          {day.type === null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: "11px", color: "#8A8580", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Was gibt es heute Abend?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onSelectType(day.dayOfWeek, "abendessen")}
                  style={{
                    flex: 1, padding: "12px 8px",
                    background: "#FAF6F1", border: "1px solid #E8E2DA", borderRadius: 12,
                    fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    color: "#2D2A26", fontFamily: "'DM Sans', sans-serif",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: "22px" }}>🍲</span>
                  Abendessen
                </button>
                <button
                  onClick={() => !abendBrotFull && onSelectType(day.dayOfWeek, "abendbrot")}
                  disabled={abendBrotFull}
                  title={abendBrotFull ? "Max. 2× Abendbrot pro Woche" : undefined}
                  style={{
                    flex: 1, padding: "12px 8px",
                    background: abendBrotFull ? "#F5F3FF" : "#F5F3FF",
                    border: `1px solid ${abendBrotFull ? "#E8E2DA" : "#DDD6FE"}`, borderRadius: 12,
                    fontSize: "13px", fontWeight: 600,
                    cursor: abendBrotFull ? "not-allowed" : "pointer",
                    color: abendBrotFull ? "#C0BAB4" : "#4C1D95",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    opacity: abendBrotFull ? 0.55 : 1,
                  }}
                >
                  <span style={{ fontSize: "22px" }}>🍞</span>
                  Abendbrot
                  {abendBrotFull && (
                    <span style={{ fontSize: "10px", color: "#C0BAB4", fontWeight: 400 }}>Max. 2/Woche</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Typ-Tabs (Typ bereits gesetzt — Wechsel erlaubt) ── */}
          {day.type !== null && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button
                onClick={() => onSelectType(day.dayOfWeek, "abendessen")}
                style={{
                  padding: "5px 13px", borderRadius: 8, border: "1px solid",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  borderColor: day.type === "abendessen" ? "#C85D3B" : "#E8E2DA",
                  background: day.type === "abendessen" ? "#C85D3B" : "#FAF6F1",
                  color: day.type === "abendessen" ? "#fff" : "#8A8580",
                }}
              >🍲 Abendessen</button>
              <button
                onClick={() => !abendBrotFull && onSelectType(day.dayOfWeek, "abendbrot")}
                disabled={abendBrotFull}
                title={abendBrotFull ? "Max. 2× Abendbrot pro Woche" : undefined}
                style={{
                  padding: "5px 13px", borderRadius: 8, border: "1px solid",
                  fontSize: "12px", fontWeight: 600,
                  cursor: abendBrotFull ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  borderColor: day.type === "abendbrot" ? "#7B6BA4" : "#E8E2DA",
                  background: day.type === "abendbrot" ? "#7B6BA4" : "#FAF6F1",
                  color: day.type === "abendbrot" ? "#fff" : (abendBrotFull ? "#C0BAB4" : "#8A8580"),
                  opacity: abendBrotFull ? 0.6 : 1,
                }}
              >🍞 Abendbrot</button>
              {abendBrotFull && (
                <span style={{ fontSize: "11px", color: "#8A8580", alignSelf: "center", marginLeft: 2 }}>
                  Max. 2/Woche erreicht
                </span>
              )}
            </div>
          )}

          {/* ── Abendessen: Rezept-Dropdown ── */}
          {day.type === "abendessen" && (
            <>
              <select
                value={day.recipeId ?? ""}
                onChange={(e) => onSelectRecipe(day.dayOfWeek, e.target.value || null)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  fontWeight: day.recipeId ? 600 : 400,
                  color: day.recipeId ? "#2D2A26" : "#8A8580",
                  background: "#FAF6F1",
                  border: "1px solid #E8E2DA",
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="">— Rezept wählen —</option>
                {favorites.length > 0 && (
                  <optgroup label="★ Favoriten">
                    {favorites.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
                {rest.length > 0 && (
                  <optgroup label="Alle Rezepte">
                    {rest.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Recipe summary row: thumbnail + badges */}
              {day.recipe && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 8 }}>
                  <RecipeThumb
                    imageUrl={day.recipe.imageUrl}
                    category={day.recipe.category}
                    size={48}
                    borderRadius={10}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", flex: 1, paddingTop: 2 }}>
                    {cat && (
                      <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: 999, background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`, fontWeight: 600 }}>
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                    {day.recipe.prepTime + day.recipe.cookTime > 0 && (
                      <span style={{ fontSize: "11px", color: "#8A8580" }}>
                        ⏱ {day.recipe.prepTime + day.recipe.cookTime} Min
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Abendbrot ── */}
          {isAbendbrot && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#F5F3FF", border: "1px solid #DDD6FE",
                borderRadius: 10, padding: "10px 12px", marginBottom: 10,
              }}>
                <span style={{ fontSize: "22px" }}>🍞</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#4C1D95" }}>Abendbrot</div>
                  <div style={{ fontSize: "12px", color: "#6D28D9", marginTop: 1 }}>Brot · Aufschnitt · Käse · Gemüse</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={day.estimatedCost || "6.00"}
                    onChange={(e) => onSetCost(day.dayOfWeek, e.target.value)}
                    style={{
                      width: 60, padding: "4px 6px", background: "#EEE8FF",
                      border: "1px solid #C4B5FD", borderRadius: 8,
                      fontSize: "13px", fontWeight: 700, color: "#4C1D95",
                      outline: "none", fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#6D28D9" }}>€</span>
                </div>
              </div>

              {/* Snack highlight */}
              {day.snackRecipe ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#FFFBEB", border: "1px solid #FDE68A",
                  borderRadius: 10, padding: "8px 12px",
                }}>
                  <span style={{ fontSize: "16px" }}>🧀</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#92400E" }}>
                      + {day.snackRecipe.name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#A16207", marginLeft: 6 }}>
                      {formatEuro(parseFloat(day.snackRecipe.estimatedCost || "0"))}
                    </span>
                  </div>
                  <button
                    onClick={onEditSnack}
                    style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(255,255,255,0.7)", border: "1px solid #FDE68A", borderRadius: 6, cursor: "pointer", color: "#92400E", fontFamily: "'DM Sans', sans-serif" }}
                  >ändern</button>
                  <button
                    onClick={onRemoveSnack}
                    style={{ fontSize: "14px", background: "none", border: "none", cursor: "pointer", color: "#A16207", padding: "0 2px" }}
                  >×</button>
                </div>
              ) : (
                <button
                  onClick={onEditSnack}
                  style={{
                    width: "100%", padding: "8px 12px",
                    background: "transparent", border: "1.5px dashed #FDE68A",
                    borderRadius: 10, fontSize: "12px", color: "#92400E",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >🧀 Highlight-Snack hinzufügen</button>
              )}
            </>
          )}
        </div>
      )}

      {/* Skipped overlay message */}
      {day.skipped && (
        <div style={{ padding: "10px 14px", fontSize: "13px", color: "#8A8580", fontStyle: "italic" }}>
          Auswärts essen – kein Kochen geplant.
        </div>
      )}
    </div>
  );
}
