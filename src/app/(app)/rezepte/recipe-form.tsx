"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { formatEuro } from "@/lib/utils";
import { RecipeImage } from "@/components/recipe-image";
import type { ScanResult } from "./scan-modal";

interface Ingredient {
  id?: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
  preferredShop: string;
  estimatedPrice: string;
  bio: boolean;
}

interface Recipe {
  id: string;
  name: string;
  type: string;
  category: string;
  prepTime: number;
  cookTime: number;
  estimatedCost: string;
  isFavorite: boolean;
  imageUrl: string | null;
  steps: string[];
  ingredients: Ingredient[];
}

interface RecipeFormProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSaved: () => void;
  prefill?: ScanResult;
}


const SHOPS = ["Aldi", "Supermarkt", "Metzger", "Vorrat"];
const UNITS = ["g", "kg", "ml", "l", "Stück", "EL", "TL", "Dose", "Packung", "Prise", "Zehe", "Scheibe", "Portion"];
const ING_CATS = ["fleisch", "fisch", "gemüse", "milchprodukte", "käse", "backwaren", "nudeln", "gewürze", "sonstiges"];

async function saveRecipe(recipe: Recipe | null, data: object) {
  const url = recipe ? `/api/recipes/${recipe.id}` : "/api/recipes";
  const res = await fetch(url, { method: recipe ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Fehler");
  return res.json();
}

async function deleteRecipe(id: string) {
  const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Fehler");
}

// Shared input style
const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px", background: "#FAF6F1", border: "1px solid #E8E2DA",
  borderRadius: 12, fontSize: "15px", color: "#2D2A26", outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};
const sel: React.CSSProperties = { ...inp, cursor: "pointer" };
const label: React.CSSProperties = { fontSize: "12px", color: "#8A8580", display: "block", marginBottom: 5, fontFamily: "'DM Sans', sans-serif" };

export function RecipeForm({ recipe, onClose, onSaved, prefill }: RecipeFormProps) {
  const [tab, setTab] = useState<"basis" | "zutaten" | "zubereitung">("basis");
  const [name, setName] = useState(prefill?.name ?? recipe?.name ?? "");
  const [type, setType] = useState(prefill?.type ?? recipe?.type ?? "abendessen");
  const [category, setCategory] = useState(prefill?.category ?? recipe?.category ?? "vegetarisch");
  const [prepTime, setPrepTime] = useState(String(prefill?.prepTime ?? recipe?.prepTime ?? "10"));
  const [cookTime, setCookTime] = useState(String(prefill?.cookTime ?? recipe?.cookTime ?? "20"));
  const [isFavorite, setIsFavorite] = useState(recipe?.isFavorite ?? false);
  const [imageUrl, setImageUrl] = useState<string | null>(prefill?.imageUrl ?? recipe?.imageUrl ?? null);
  const [imageUploading, setImageUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Tracks the recipe ID even before the user clicks "Save" (set via silent save during image gen)
  const [liveRecipeId, setLiveRecipeId] = useState<string | null>(recipe?.id ?? null);
  const [steps, setSteps] = useState<string[]>(
    prefill?.steps?.length ? prefill.steps : (recipe?.steps?.length ? recipe.steps : [""])
  );
  const [ings, setIngs] = useState<Ingredient[]>(
    prefill?.ingredients?.length
      ? prefill.ingredients.map((i) => ({ ...i, estimatedPrice: String(i.estimatedPrice) }))
      : recipe?.ingredients?.length
      ? recipe.ingredients
      : [{ name: "", amount: "", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "", bio: false }]
  );
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/recipes/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setImageUrl(data.url);
    } finally {
      setImageUploading(false);
    }
  }

  function buildPayload() {
    return { name, type, category, prepTime: Number(prepTime), cookTime: Number(cookTime), estimatedCost: totalCost.toFixed(2), isFavorite, imageUrl, steps: steps.filter(Boolean), ingredients: ings.filter((i) => i.name) };
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      // If this is a new recipe but was silently saved before (via image gen), do a PUT
      if (liveRecipeId && !recipe) {
        return fetch(`/api/recipes/${liveRecipeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        }).then((r) => { if (!r.ok) throw new Error("Fehler"); return r.json(); });
      }
      return saveRecipe(recipe, buildPayload());
    },
  });

  async function handleGenerateImage() {
    if (!name || generating || imageUploading) return;
    setGenerating(true);
    try {
      let id = liveRecipeId;
      // New recipe: save silently first to get an ID
      if (!id) {
        const saved = await saveRecipe(null, buildPayload()) as Recipe;
        id = saved.id;
        setLiveRecipeId(id);
      }
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName: name, recipeId: id }),
      });
      const data = await res.json() as { url?: string };
      if (res.ok && data.url) setImageUrl(data.url);
    } catch {
      // silent – image is optional
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    let saved: Recipe & { ingredients: unknown[] } | null = null;
    try {
      saved = await saveMutation.mutateAsync();
      if (saved?.id) setLiveRecipeId(saved.id);
    } catch {
      return; // error displayed via saveMutation.isError
    }
    // If no image yet, generate one via Gemini
    if (!imageUrl && saved?.id) {
      setGenerating(true);
      try {
        await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeName: name, recipeId: saved.id }),
        });
      } catch {
        // silent – image is optional
      } finally {
        setGenerating(false);
      }
    }
    onSaved();
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipe!.id),
    onSuccess: onSaved,
  });

  const totalCost = ings.reduce((s, i) => s + (parseFloat(i.estimatedPrice) || 0), 0);

  function updIng(idx: number, field: keyof Ingredient, value: string | boolean) {
    setIngs((p) => p.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
  }

  function updStep(idx: number, val: string) {
    setSteps((prev) => prev.map((s, i) => i === idx ? val : s));
  }

  const TABS = [
    { id: "basis" as const, label: "Grunddaten" },
    { id: "zutaten" as const, label: "Zutaten" },
    { id: "zubereitung" as const, label: "Zubereitung" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Recipe image */}
      <div style={{ position: "relative" }}>
        <RecipeImage
          imageUrl={imageUrl}
          category={category}
          height={200}
          style={{ borderRadius: 16, overflow: "hidden" }}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={imageUploading || generating}
          style={{
            position: "absolute", bottom: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontSize: "13px", fontWeight: 600, cursor: imageUploading || generating ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            backdropFilter: "blur(4px)",
          }}
        >
          {imageUploading ? "Lädt…" : "📷 Foto"}
        </button>
        <button
          type="button"
          onClick={handleGenerateImage}
          disabled={!name || generating || imageUploading}
          title={!name ? "Erst einen Rezeptnamen eingeben" : "KI-Bild mit Gemini generieren"}
          style={{
            position: "absolute", bottom: 10, left: 10,
            background: generating ? "rgba(123,107,164,0.85)" : "rgba(123,107,164,0.75)", color: "#fff",
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontSize: "13px", fontWeight: 600,
            cursor: !name || generating || imageUploading ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            backdropFilter: "blur(4px)",
            opacity: !name ? 0.5 : 1,
          }}
        >
          {generating ? "⏳ Generiert…" : "🎨 KI-Bild"}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
        />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5EDE6", border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600, color: "#2D2A26", flex: 1, margin: 0 }}>
          {recipe ? recipe.name : "Neues Rezept"}
        </h1>
        {recipe && (
          <button onClick={() => { if (confirm("Rezept wirklich löschen?")) deleteMutation.mutate(); }}
            style={{ padding: "6px 12px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 10, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Löschen
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "#F5EDE6", borderRadius: 12, padding: 4, gap: 2 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#2D2A26" : "#8A8580", boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Grunddaten ── */}
      {tab === "basis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={label}>Rezeptname *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Bolognese mit Spaghetti" style={inp} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={label}>Typ</span>
              <select value={type} onChange={(e) => setType(e.target.value)} style={sel}>
                <option value="abendessen">Abendessen</option>
                <option value="abendbrot">Abendbrot</option>
              </select>
            </div>
            <div>
              <span style={label}>Kategorie</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={sel}>
                <option value="fleisch">🥩 Fleisch</option>
                <option value="fisch">🐟 Fisch</option>
                <option value="vegetarisch">🥦 Vegetarisch</option>
                <option value="abendbrot">🍞 Abendbrot</option>
                <option value="snack">🍎 Snack</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Vorbereitung", val: prepTime, set: setPrepTime, unit: "Min" },
              { label: "Kochen", val: cookTime, set: setCookTime, unit: "Min" },
            ].map((f) => (
              <div key={f.label}>
                <span style={label}>{f.label}</span>
                <div style={{ position: "relative" }}>
                  <input type="number" step="1" value={f.val} onChange={(e) => f.set(e.target.value)}
                    style={{ ...inp, paddingRight: 40 }} />
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#8A8580" }}>{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <span style={label}>Kosten (berechnet aus Zutaten)</span>
            <div style={{ ...inp, background: "#F0EDE8", color: "#5A8A5E", fontWeight: 700, cursor: "default" }}>
              {formatEuro(totalCost)}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF6F1", border: "1px solid #E8E2DA", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
            <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#C85D3B" }} />
            <span style={{ fontSize: "14px", color: "#2D2A26" }}>⭐ Als Favorit markieren</span>
          </label>
        </div>
      )}

      {/* ── Tab: Zutaten ── */}
      {tab === "zutaten" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ings.length > 0 && (
            <div style={{ background: "rgba(90,138,94,0.1)", borderRadius: 10, padding: "8px 14px", fontSize: "13px", color: "#5A8A5E", fontWeight: 500 }}>
              Zutaten-Kosten gesamt: {formatEuro(totalCost)}
            </div>
          )}
          {ings.map((ing, idx) => (
            <div key={idx} style={{ background: "#fff", border: "1px solid #E8E2DA", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={ing.name} onChange={(e) => updIng(idx, "name", e.target.value)} placeholder="Zutatename"
                  style={{ ...inp, flex: 1, fontSize: "14px", padding: "10px 12px" }} />
                <button onClick={() => setIngs((p) => p.filter((_, i) => i !== idx))}
                  style={{ width: 36, height: 40, borderRadius: 10, background: "#FEE2E2", border: "none", color: "#DC2626", cursor: "pointer", fontSize: "18px", flexShrink: 0 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <input value={ing.amount} onChange={(e) => updIng(idx, "amount", e.target.value)} placeholder="Menge"
                  style={{ ...inp, fontSize: "13px", padding: "8px 10px" }} />
                <select value={ing.unit} onChange={(e) => updIng(idx, "unit", e.target.value)} style={{ ...sel, fontSize: "13px", padding: "8px 10px" }}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
                <div style={{ position: "relative" }}>
                  <input type="number" step="0.01" value={ing.estimatedPrice} onChange={(e) => updIng(idx, "estimatedPrice", e.target.value)} placeholder="0.00"
                    style={{ ...inp, fontSize: "13px", padding: "8px 24px 8px 10px" }} />
                  <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#8A8580" }}>€</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={ing.preferredShop} onChange={(e) => updIng(idx, "preferredShop", e.target.value)} style={{ ...sel, fontSize: "13px", padding: "8px 10px" }}>
                  {SHOPS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={ing.category} onChange={(e) => updIng(idx, "category", e.target.value)} style={{ ...sel, fontSize: "13px", padding: "8px 10px" }}>
                  {ING_CATS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", color: "#2D2A26", cursor: "pointer" }}>
                <input type="checkbox" checked={ing.bio} onChange={(e) => updIng(idx, "bio", e.target.checked)} style={{ accentColor: "#5A8A5E" }} />
                Bio
              </label>
            </div>
          ))}
          <button
            onClick={() => setIngs((p) => [...p, { name: "", amount: "", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "", bio: false }])}
            style={{ padding: "14px", border: "2px dashed #E8E2DA", borderRadius: 14, background: "transparent", color: "#8A8580", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            + Zutat hinzufügen
          </button>
        </div>
      )}

      {/* ── Tab: Zubereitung ── */}
      {tab === "zubereitung" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#C85D3B", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 10 }}>
                {idx + 1}
              </span>
              <textarea value={step} onChange={(e) => updStep(idx, e.target.value)} placeholder={`Schritt ${idx + 1}…`} rows={2}
                style={{ flex: 1, padding: "10px 12px", background: "#FAF6F1", border: "1px solid #E8E2DA", borderRadius: 12, fontSize: "14px", color: "#2D2A26", outline: "none", resize: "none", fontFamily: "'DM Sans', sans-serif" }} />
              <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE2E2", border: "none", color: "#DC2626", cursor: "pointer", fontSize: "18px", flexShrink: 0, marginTop: 5 }}>×</button>
            </div>
          ))}
          <button onClick={() => setSteps([...steps, ""])}
            style={{ padding: "10px", border: "2px dashed #E8E2DA", borderRadius: 12, background: "transparent", color: "#8A8580", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            + Schritt hinzufügen
          </button>
        </div>
      )}

      {/* Save button */}
      <div style={{ paddingTop: 4 }}>
        {saveMutation.isError && (
          <p style={{ color: "#DC2626", fontSize: "13px", marginBottom: 8 }}>Fehler beim Speichern. Bitte alle Felder prüfen.</p>
        )}
        <button
          onClick={handleSave}
          disabled={!name || saveMutation.isPending || generating}
          style={{ width: "100%", padding: "16px", background: !name || saveMutation.isPending || generating ? "#E8D5C8" : "#C85D3B", color: "#fff", border: "none", borderRadius: 16, fontSize: "16px", fontWeight: 600, cursor: !name || saveMutation.isPending || generating ? "default" : "pointer", boxShadow: name ? "0 4px 16px rgba(200,93,59,0.3)" : "none", fontFamily: "'DM Sans', sans-serif" }}>
          {generating ? "Bild wird generiert…" : saveMutation.isPending ? "Wird gespeichert…" : recipe ? "Änderungen speichern" : "Rezept erstellen"}
        </button>
      </div>
    </div>
  );
}
