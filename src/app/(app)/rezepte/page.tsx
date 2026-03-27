"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, BookPlus } from "lucide-react";
import { RecipeImage } from "@/components/recipe-image";
import { formatEuro } from "@/lib/utils";
import type { ScanResult } from "./scan-modal";

const RecipeForm  = dynamic(() => import("./recipe-form").then((m) => m.RecipeForm),   { ssr: false });
const SuggestPanel = dynamic(() => import("./suggest-panel").then((m) => m.SuggestPanel), { ssr: false });
const ScanModal   = dynamic(() => import("./scan-modal").then((m) => m.ScanModal),     { ssr: false });

type MealCategory = "fleisch" | "fisch" | "vegetarisch" | "abendbrot" | "snack";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
  preferredShop: string;
  estimatedPrice: string;
  bio: boolean;
  isBasic: boolean;
}

interface Recipe {
  id: string;
  name: string;
  type: string;
  category: MealCategory;
  prepTime: number;
  cookTime: number;
  estimatedCost: string;
  isFavorite: boolean;
  imageUrl: string | null;
  steps: string[];
  ingredients: Ingredient[];
}

const CAT: Record<MealCategory, { label: string; color: string; bg: string; emoji: string }> = {
  fleisch:     { label: "Fleisch",     color: "#C85D3B", bg: "rgba(200,93,59,0.1)",   emoji: "🥩" },
  fisch:       { label: "Fisch",       color: "#2563EB", bg: "rgba(37,99,235,0.08)",  emoji: "🐟" },
  vegetarisch: { label: "Vegetarisch", color: "#5A8A5E", bg: "rgba(90,138,94,0.1)",   emoji: "🥦" },
  abendbrot:   { label: "Abendbrot",   color: "#7B6BA4", bg: "rgba(123,107,164,0.1)", emoji: "🍞" },
  snack:       { label: "Snack",       color: "#92400E", bg: "rgba(245,158,11,0.1)",  emoji: "🍎" },
};

const FILTERS = [
  { value: "alle",       label: "Alle" },
  { value: "abendessen", label: "🍽️ Abendessen" },
  { value: "abendbrot",  label: "🍞 Abendbrot" },
  { value: "snack",      label: "🍎 Snacks" },
  { value: "sonstiges",  label: "📦 Sonstiges" },
] as const;


async function fetchRecipes(): Promise<Recipe[]> {
  const res = await fetch("/api/recipes");
  if (!res.ok) throw new Error("Fehler");
  return res.json();
}

async function seedRecipes(): Promise<{ message: string; seeded: boolean }> {
  const res = await fetch("/api/seed", { method: "POST" });
  if (!res.ok) throw new Error("Fehler");
  return res.json();
}

export default function RezeptePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("alle");
  const [editRecipe, setEditRecipe] = useState<Recipe | null | "neu">(null);
  const [showScan, setShowScan] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<ScanResult | null>(null);

  const { data: recipeList = [], isLoading, error } = useQuery({ queryKey: ["recipes"], queryFn: fetchRecipes });

  const seedMutation = useMutation({
    mutationFn: seedRecipes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const ABENDESSEN_CATS = ["fleisch", "fisch", "vegetarisch"];
  const filtered = filter === "alle"
    ? recipeList
    : filter === "abendessen"
    ? recipeList.filter((r) => ABENDESSEN_CATS.includes(r.category))
    : filter === "sonstiges"
    ? recipeList.filter((r) => !ABENDESSEN_CATS.includes(r.category) && r.category !== "abendbrot" && r.category !== "snack")
    : recipeList.filter((r) => r.category === filter);

  if (editRecipe !== null) {
    return (
      <RecipeForm
        recipe={editRecipe === "neu" ? null : editRecipe}
        prefill={scanPrefill ?? undefined}
        onClose={() => { setEditRecipe(null); setScanPrefill(null); }}
        onSaved={() => { setEditRecipe(null); setScanPrefill(null); queryClient.invalidateQueries({ queryKey: ["recipes"] }); }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Scan modal */}
      {showScan && (
        <ScanModal
          onClose={() => setShowScan(false)}
          onScanned={(result) => {
            setScanPrefill(result);
            setShowScan(false);
            setEditRecipe("neu");
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", fontWeight: 600, color: "#2D2A26", margin: 0 }}>
          Rezepte
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowScan(true)}
            title="Rezept scannen oder importieren"
            style={{ width: 44, height: 44, borderRadius: "50%", background: "#5A8A5E", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(90,138,94,0.35)" }}>
            <Camera size={20} />
          </button>
          <button
            onClick={() => { setScanPrefill(null); setEditRecipe("neu"); }}
            title="Neues Rezept erstellen"
            style={{ width: 44, height: 44, borderRadius: "50%", background: "#C85D3B", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(200,93,59,0.35)" }}>
            <BookPlus size={22} />
          </button>
        </div>
      </div>

      {/* AI suggest panel */}
      <SuggestPanel />

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, msOverflowStyle: "none" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${filter === f.value ? "#C85D3B" : "#E8E2DA"}`, background: filter === f.value ? "#C85D3B" : "#fff", color: filter === f.value ? "#fff" : "#2D2A26", fontSize: "13px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: "12px", color: "#8A8580", alignSelf: "center", whiteSpace: "nowrap", paddingLeft: 4 }}>
          {filtered.length} Rezepte
        </span>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 88, background: "#F5EDE6", borderRadius: 16 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: "14px", color: "#991B1B" }}>
          Fehler beim Laden der Rezepte.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && recipeList.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "56px" }}>🍽️</span>
          <p style={{ color: "#8A8580", margin: 0 }}>Noch keine Rezepte vorhanden.</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={{ padding: "14px 24px", background: "#5A8A5E", color: "#fff", border: "none", borderRadius: 14, fontSize: "15px", fontWeight: 600, cursor: seedMutation.isPending ? "default" : "pointer", opacity: seedMutation.isPending ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {seedMutation.isPending ? "Wird geladen…" : "Starter-Rezepte laden (6 + 20 Snacks)"}
          </button>
          {seedMutation.data && (
            <p style={{ fontSize: "13px", color: "#5A8A5E", margin: 0 }}>{seedMutation.data.message}</p>
          )}
        </div>
      )}

      {/* No filter match */}
      {!isLoading && filtered.length === 0 && recipeList.length > 0 && (
        <p style={{ textAlign: "center", color: "#8A8580", padding: "32px 0", fontSize: "14px" }}>
          Keine Rezepte in dieser Kategorie.
        </p>
      )}

      {/* Recipe cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((recipe) => {
          const cat = CAT[recipe.category] ?? CAT.vegetarisch;
          return (
            <div
              key={recipe.id}
              onClick={() => setEditRecipe(recipe)}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E2DA", cursor: "pointer", boxShadow: "0 1px 4px rgba(45,42,38,0.06)", overflow: "hidden" }}>
              {/* Recipe image header */}
              <RecipeImage imageUrl={recipe.imageUrl} category={recipe.category} height={160} style={{ borderRadius: "16px 16px 0 0", overflow: "hidden" }} />
              <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#2D2A26", margin: 0, lineHeight: 1.3 }}>
                      {recipe.isFavorite && <span style={{ color: "#F59E0B" }}>★ </span>}
                      {recipe.name}
                    </h2>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: 999, background: cat.bg, color: cat.color, fontWeight: 500 }}>
                        {cat.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#2D2A26" }}>
                      {formatEuro(parseFloat(recipe.estimatedCost))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8A8580", marginTop: 2 }}>
                      {recipe.prepTime + recipe.cookTime} Min
                    </div>
                  </div>
                </div>
                {recipe.ingredients.length > 0 && (
                  <p style={{ fontSize: "12px", color: "#8A8580", margin: "6px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {recipe.ingredients.slice(0, 4).map((i) => i.name).join(", ")}
                    {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4}`}
                  </p>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
