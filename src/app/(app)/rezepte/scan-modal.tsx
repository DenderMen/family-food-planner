"use client";

import { useRef, useState } from "react";
import { Camera, Image, Link2, X, Loader2 } from "lucide-react";

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  category: string;
  preferredShop: string;
  estimatedPrice: number;
  bio: boolean;
  isBasic?: boolean;
}

export interface ScanResult {
  name: string;
  type: string;
  category: string;
  prepTime: number;
  cookTime: number;
  estimatedCost: number;
  imageUrl: string | null;
  steps: string[];
  ingredients: Ingredient[];
}

interface ScanModalProps {
  onClose: () => void;
  onScanned: (result: ScanResult) => void;
}

type Mode = "menu" | "url" | "loading";

export function ScanModal({ onClose, onScanned }: ScanModalProps) {
  const [mode, setMode] = useState<Mode>("menu");
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState("Analysiere Rezept…");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setMode("loading");
    setLoadingLabel("Bild wird hochgeladen…");

    const fd = new FormData();
    fd.append("file", file);

    try {
      setLoadingLabel("Rezept wird erkannt…");
      const res = await fetch("/api/recipes/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler"); setMode("menu"); return; }
      onScanned(data as ScanResult);
    } catch {
      setError("Netzwerkfehler");
      setMode("menu");
    }
  }

  async function handleUrl() {
    if (!urlInput.trim()) return;
    setError(null);
    setMode("loading");
    setLoadingLabel("Seite wird geladen…");

    try {
      setLoadingLabel("Rezept wird erkannt…");
      const res = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler"); setMode("url"); return; }
      onScanned(data as ScanResult);
    } catch {
      setError("Netzwerkfehler");
      setMode("url");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          background: "#FFFAF7",
          borderRadius: "24px 24px 0 0",
          padding: "12px 20px 40px",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D8D0C8", margin: "0 auto 20px" }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8A8580" }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 700, color: "#2D2A26", margin: "0 0 20px" }}>
          Rezept hinzufügen
        </h2>

        {/* Loading state */}
        {mode === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
            <Loader2 size={40} color="#C85D3B" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#2D2A26", fontWeight: 600, fontSize: "16px", margin: 0 }}>{loadingLabel}</p>
            <p style={{ color: "#8A8580", fontSize: "14px", margin: 0 }}>Das kann ein paar Sekunden dauern…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Menu state */}
        {mode === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: "14px", color: "#991B1B" }}>
                {error}
              </div>
            )}

            {/* Camera */}
            <button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.capture = "environment";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleFile(f);
                };
                input.click();
              }}
              style={optionStyle("#FFF5F0", "#C85D3B")}
            >
              <Camera size={28} color="#C85D3B" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#2D2A26" }}>Foto aufnehmen</div>
                <div style={{ fontSize: "13px", color: "#8A8580" }}>Kamera öffnen und Rezept fotografieren</div>
              </div>
            </button>

            {/* Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={optionStyle("#F0F5FF", "#2563EB")}
            >
              <Image size={28} color="#2563EB" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#2D2A26" }}>Aus Galerie wählen</div>
                <div style={{ fontSize: "13px", color: "#8A8580" }}>Foto aus der Fotobibliothek importieren</div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {/* URL */}
            <button
              onClick={() => setMode("url")}
              style={optionStyle("#F0FAF0", "#5A8A5E")}
            >
              <Link2 size={28} color="#5A8A5E" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#2D2A26" }}>URL importieren</div>
                <div style={{ fontSize: "13px", color: "#8A8580" }}>Rezept von einer Webseite importieren</div>
              </div>
            </button>
          </div>
        )}

        {/* URL input state */}
        {mode === "url" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: "14px", color: "#991B1B" }}>
                {error}
              </div>
            )}
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#2D2A26" }}>
              Rezept-URL
            </label>
            <input
              type="url"
              autoFocus
              placeholder="https://www.chefkoch.de/rezepte/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrl()}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1.5px solid #E8E2DA",
                fontSize: "15px",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                boxSizing: "border-box",
                color: "#2D2A26",
                background: "#fff",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setMode("menu"); setError(null); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #E8E2DA", background: "#fff", fontSize: "15px", fontWeight: 600, color: "#8A8580", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Zurück
              </button>
              <button
                onClick={handleUrl}
                disabled={!urlInput.trim()}
                style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: urlInput.trim() ? "#5A8A5E" : "#E8E2DA", fontSize: "15px", fontWeight: 700, color: urlInput.trim() ? "#fff" : "#8A8580", cursor: urlInput.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
              >
                Importieren
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function optionStyle(bg: string, _accent: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 16,
    border: "1.5px solid rgba(0,0,0,0.06)",
    background: bg,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: "'DM Sans', sans-serif",
  };
}
