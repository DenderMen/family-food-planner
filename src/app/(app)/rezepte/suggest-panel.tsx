"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatEuro } from "@/lib/utils";
import type { SuggestedRecipe, SuggestResponse } from "@/app/api/suggest/route";

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CFG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  fleisch:     { label: "Fleisch",     emoji: "🥩", color: "#9A3412", bg: "#FEF3EE", border: "#FDBA99" },
  fisch:       { label: "Fisch",       emoji: "🐟", color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
  vegetarisch: { label: "Vegetarisch", emoji: "🥦", color: "#14532D", bg: "#F0FDF4", border: "#BBF7D0" },
  abendbrot:   { label: "Abendbrot",   emoji: "🍞", color: "#4C1D95", bg: "#F5F3FF", border: "#DDD6FE" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSuggestions(wish: string): Promise<SuggestedRecipe[]> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wish }),
  });
  const data = await res.json() as SuggestResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Fehler");
  return data.suggestions;
}

async function saveRecipe(suggestion: SuggestedRecipe): Promise<void> {
  const payload = {
    name:          suggestion.name,
    type:          suggestion.type,
    category:      suggestion.category,
    prepTime:      suggestion.prepTime,
    cookTime:      suggestion.cookTime,
    estimatedCost: String(suggestion.estimatedCost.toFixed(2)),
    isFavorite:    false,
    nursingBoost:  suggestion.nursingBoost,
    steps:         suggestion.steps,
    ingredients:   suggestion.ingredients,
  };
  const res = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Fehler beim Speichern");
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SuggestPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen]             = useState(false);
  const [wish, setWish]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedRecipe[]>([]);
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSaveStates({});
    try {
      const results = await fetchSuggestions(wish);
      setSuggestions(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(idx: number) {
    setSaveStates((p) => ({ ...p, [idx]: "saving" }));
    try {
      await saveRecipe(suggestions[idx]);
      setSaveStates((p) => ({ ...p, [idx]: "saved" }));
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    } catch {
      setSaveStates((p) => ({ ...p, [idx]: "error" }));
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E8E2DA",
    boxShadow: "0 1px 4px rgba(45,42,38,0.06)",
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "linear-gradient(135deg, #7B6BA4 0%, #9B8BC4 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 14,
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 4px 14px rgba(123,107,164,0.35)",
        }}
      >
        🤖 Rezept vorschlagen
      </button>
    );
  }

  return (
    <div style={{ ...card, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #7B6BA4 0%, #9B8BC4 100%)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>🤖 KI-Rezeptvorschläge</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
            Claude Sonnet · Saisonal · Familiengerecht
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >×</button>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Wish input */}
        <div>
          <label style={{ fontSize: "12px", color: "#8A8580", display: "block", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
            Ich hätte Lust auf… (optional)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSuggest()}
              placeholder="z.B. etwas mit Hähnchen, schnelle Pasta, Fisch…"
              style={{
                flex: 1,
                padding: "11px 14px",
                background: "#FAF6F1",
                border: "1px solid #E8E2DA",
                borderRadius: 12,
                fontSize: "14px",
                color: "#2D2A26",
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={handleSuggest}
              disabled={loading}
              style={{
                padding: "11px 18px",
                background: loading ? "#E8D5C8" : "#7B6BA4",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              {loading ? "⏳" : "✨ Los"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: "13px", color: "#7B6BA4", fontWeight: 600, textAlign: "center" }}>
              Claude denkt nach…
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 110, background: "#F5EDE6", borderRadius: 14, opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", fontSize: "14px", color: "#991B1B" }}>
            ❌ {error}
          </div>
        )}

        {/* Suggestions */}
        {!loading && suggestions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "12px", color: "#8A8580", fontStyle: "italic" }}>
              3 Vorschläge passend zur aktuellen Woche:
            </div>
            {suggestions.map((s, idx) => (
              <SuggestionCard
                key={idx}
                suggestion={s}
                saveState={saveStates[idx] ?? "idle"}
                onSave={() => handleSave(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: SuggestedRecipe;
  saveState: SaveState;
  onSave: () => void;
}

function SuggestionCard({ suggestion, saveState, onSave }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat = CAT_CFG[suggestion.category] ?? CAT_CFG.vegetarisch;
  const totalTime = suggestion.prepTime + suggestion.cookTime;
  const saved = saveState === "saved";

  return (
    <div style={{
      background: saved ? "rgba(90,138,94,0.04)" : "#FAF6F1",
      borderRadius: 14,
      border: `1px solid ${saved ? "rgba(90,138,94,0.3)" : "#E8E2DA"}`,
      overflow: "hidden",
      transition: "border-color 0.3s",
    }}>
      {/* Card header */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: "26px", lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{cat.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#2D2A26", lineHeight: 1.3 }}>
              {suggestion.name}
            </div>
            {/* Badges */}
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: 999, background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`, fontWeight: 600 }}>
                {cat.label}
              </span>
              <span style={{ fontSize: "11px", color: "#8A8580" }}>⏱ {totalTime} Min</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#2D2A26" }}>
                {formatEuro(suggestion.estimatedCost)}
              </span>
              {suggestion.nursingBoost && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: 999, background: "rgba(236,72,153,0.1)", color: "#9D174D", border: "1px solid rgba(236,72,153,0.2)", fontWeight: 500 }}>
                  🤱 Stillzeit
                </span>
              )}
              {suggestion.bestFor && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", color: "#14532D", border: "1px solid #BBF7D0", fontWeight: 500 }}>
                  👍 {suggestion.bestFor}
                </span>
              )}
            </div>
            {/* AI reasoning */}
            {suggestion.reason && (
              <p style={{ fontSize: "12px", color: "#7B6BA4", margin: "6px 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                💡 {suggestion.reason}
              </p>
            )}
          </div>
        </div>

        {/* Ingredient preview */}
        {suggestion.ingredients.length > 0 && (
          <p style={{ fontSize: "12px", color: "#8A8580", margin: "8px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {suggestion.ingredients.slice(0, 5).map((i) => i.name).join(", ")}
            {suggestion.ingredients.length > 5 && ` +${suggestion.ingredients.length - 5}`}
          </p>
        )}

        {/* Action row */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ flex: 1, padding: "8px 0", background: "#fff", border: "1px solid #E8E2DA", borderRadius: 10, fontSize: "12px", color: "#8A8580", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            {expanded ? "▲ Weniger" : "▼ Details"}
          </button>
          <button
            onClick={onSave}
            disabled={saved || saveState === "saving"}
            style={{
              flex: 2,
              padding: "8px 0",
              background: saved ? "#5A8A5E" : saveState === "saving" ? "#E8D5C8" : "#C85D3B",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: "13px",
              fontWeight: 600,
              cursor: saved || saveState === "saving" ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.25s",
            }}
          >
            {saved ? "✓ Gespeichert" : saveState === "saving" ? "Wird gespeichert…" : saveState === "error" ? "❌ Fehler – nochmal?" : "➕ Übernehmen"}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #E8E2DA", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Nursing boost */}
          {suggestion.nursingBoost && (
            <div style={{ background: "rgba(236,72,153,0.06)", borderRadius: 10, padding: "10px 12px", fontSize: "13px", color: "#9D174D", border: "1px solid rgba(236,72,153,0.15)" }}>
              🤱 <strong>Stillzeit:</strong> {suggestion.nursingBoost}
            </div>
          )}

          {/* Ingredients */}
          {suggestion.ingredients.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#2D2A26", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Zutaten</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestion.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                    <span style={{ color: "#2D2A26" }}>
                      {ing.bio ? "🌿 " : ""}{ing.amount} {ing.unit} {ing.name}
                    </span>
                    <span style={{ color: "#8A8580", fontSize: "12px", marginLeft: 8, flexShrink: 0 }}>
                      {ing.preferredShop} · {formatEuro(parseFloat(ing.estimatedPrice) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {suggestion.steps.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#2D2A26", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Zubereitung</div>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {suggestion.steps.map((step, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#4A4540", lineHeight: 1.5 }}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
