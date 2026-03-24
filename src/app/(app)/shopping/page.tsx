"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getWeekId, formatEuro } from "@/lib/utils";
import type { RawIngredient, ShoppingApiResponse } from "@/app/api/shopping/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MergedItem {
  key: string;
  ingredientName: string;
  totalAmount: number;
  unit: string;
  shop: string;
  totalPrice: number;
  bio: boolean;
  forDays: { dayOfWeek: number; dayName: string; recipeName: string }[];
}

type FilterMode = "all" | "split1" | "split2";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOP_ORDER = ["Aldi", "Supermarkt", "Metzger", "Vorrat"] as const;
type ShopName = (typeof SHOP_ORDER)[number];

const SHOP_STYLE: Record<ShopName, { color: string; bg: string; border: string; emoji: string }> = {
  Aldi:       { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", emoji: "🔵" },
  Supermarkt: { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", emoji: "🛒" },
  Metzger:    { color: "#4C1D95", bg: "#F5F3FF", border: "#DDD6FE", emoji: "🟣" },
  Vorrat:     { color: "#14532D", bg: "#F0FDF4", border: "#BBF7D0", emoji: "🟢" },
};

// Einkauf 1 = Mo-Do (days 0–3), Einkauf 2 = Fr-So (days 4–6)
const DAY_RANGES: Record<FilterMode, number[]> = {
  all:    [0, 1, 2, 3, 4, 5, 6],
  split1: [0, 1, 2, 3],
  split2: [4, 5, 6],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeItems(rawItems: RawIngredient[], dayFilter: number[]): MergedItem[] {
  const map = new Map<string, MergedItem>();

  for (const raw of rawItems) {
    if (!dayFilter.includes(raw.dayOfWeek)) continue;

    // Normalise shop to known list; migrate legacy REWE/Edeka → Supermarkt
    const normalized = raw.shop === "REWE" || raw.shop === "Edeka" ? "Supermarkt" : raw.shop;
    const shop = (SHOP_ORDER as readonly string[]).includes(normalized) ? normalized : "Supermarkt";
    const key = `${raw.ingredientName.toLowerCase().trim()}__${raw.unit}__${shop}`;

    if (map.has(key)) {
      const item = map.get(key)!;
      item.totalAmount = round2(item.totalAmount + raw.amount);
      item.totalPrice  = round2(item.totalPrice  + raw.estimatedPrice);
      item.forDays.push({ dayOfWeek: raw.dayOfWeek, dayName: raw.dayName, recipeName: raw.recipeName });
    } else {
      map.set(key, {
        key,
        ingredientName: raw.ingredientName,
        totalAmount:    raw.amount,
        unit:           raw.unit,
        shop,
        totalPrice:     raw.estimatedPrice,
        bio:            raw.bio,
        forDays: [{ dayOfWeek: raw.dayOfWeek, dayName: raw.dayName, recipeName: raw.recipeName }],
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const si = SHOP_ORDER.indexOf(a.shop as ShopName);
    const sj = SHOP_ORDER.indexOf(b.shop as ShopName);
    if (si !== sj) return si - sj;
    return a.ingredientName.localeCompare(b.ingredientName, "de");
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatAmount(n: number): string {
  return n % 1 === 0
    ? String(n)
    : n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

async function fetchShopping(weekId: string): Promise<ShoppingApiResponse> {
  const res = await fetch(`/api/shopping?weekId=${weekId}`);
  if (!res.ok) throw new Error("Fehler beim Laden");
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const weekId = getWeekId();
  const [, wStr] = weekId.split("-W");

  const [filter, setFilter]     = useState<FilterMode>("all");
  const [checked, setChecked]   = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<ShoppingApiResponse>({
    queryKey: ["shopping", weekId],
    queryFn: () => fetchShopping(weekId),
    staleTime: 60 * 1000,
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const items = useMemo(
    () => mergeItems(data?.rawItems ?? [], DAY_RANGES[filter]),
    [data, filter]
  );

  const byShop = useMemo(() => {
    const map = new Map<string, MergedItem[]>();
    for (const item of items) {
      if (!map.has(item.shop)) map.set(item.shop, []);
      map.get(item.shop)!.push(item);
    }
    return map;
  }, [items]);

  const grandTotal     = items.reduce((s, i) => s + i.totalPrice, 0);
  const checkedTotal   = items.filter((i) => checked.has(i.key)).reduce((s, i) => s + i.totalPrice, 0);
  const remainingTotal = grandTotal - checkedTotal;
  const checkedCount   = checked.size;

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function checkAllInShop(shop: string, check: boolean) {
    const shopItems = byShop.get(shop) ?? [];
    setChecked((prev) => {
      const next = new Set(prev);
      shopItems.forEach((i) => (check ? next.add(i.key) : next.delete(i.key)));
      return next;
    });
  }

  // ─── Inline styles ──────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E8E2DA",
    boxShadow: "0 1px 4px rgba(45,42,38,0.06)",
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", fontWeight: 600, color: "#2D2A26", margin: 0 }}>
            Einkaufsliste
          </h1>
          <p style={{ fontSize: "13px", color: "#8A8580", margin: "2px 0 0" }}>
            KW {wStr} · automatisch aus dem Wochenplan
          </p>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={() => setChecked(new Set())}
            style={{ fontSize: "12px", padding: "6px 12px", background: "#F5EDE6", border: "none", borderRadius: 10, color: "#8A8580", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8 }}>
        {(
          [
            { id: "all" as const,    label: "Komplett",            sub: "7 Tage" },
            { id: "split1" as const, label: "Einkauf 1",           sub: "Mo – Do" },
            { id: "split2" as const, label: "Einkauf 2",           sub: "Fr – So" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              background: filter === f.id ? "#C85D3B" : "#fff",
              color: filter === f.id ? "#fff" : "#2D2A26",
              border: `1px solid ${filter === f.id ? "#C85D3B" : "#E8E2DA"}`,
              borderRadius: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700 }}>{f.label}</div>
            <div style={{ fontSize: "11px", opacity: filter === f.id ? 0.8 : 0.5, marginTop: 1 }}>{f.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, background: "#F5EDE6", borderRadius: 16 }} />
          ))}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{ ...card, padding: "16px", background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p style={{ color: "#991B1B", fontSize: "14px", margin: 0 }}>Fehler beim Laden der Einkaufsliste.</p>
        </div>
      )}

      {/* ── No plan ───────────────────────────────────────────────── */}
      {!isLoading && !error && data && !data.hasPlan && (
        <div style={{ ...card, padding: "32px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: 12 }}>📋</span>
          <p style={{ color: "#2D2A26", fontWeight: 600, margin: "0 0 6px", fontFamily: "'Fraunces', serif", fontSize: "18px" }}>
            Kein Wochenplan vorhanden
          </p>
          <p style={{ color: "#8A8580", fontSize: "14px", margin: "0 0 20px" }}>
            Erstelle zuerst einen Wochenplan und weise Rezepte zu.
          </p>
          <Link
            href="/plan"
            style={{ display: "inline-block", padding: "12px 24px", background: "#C85D3B", color: "#fff", borderRadius: 14, textDecoration: "none", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
          >
            Wochenplan öffnen →
          </Link>
        </div>
      )}

      {/* ── Plan exists but no recipes assigned ───────────────────── */}
      {!isLoading && !error && data?.hasPlan && !data.hasRecipes && (
        <div style={{ ...card, padding: "32px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: 12 }}>🥘</span>
          <p style={{ color: "#2D2A26", fontWeight: 600, margin: "0 0 6px", fontFamily: "'Fraunces', serif", fontSize: "18px" }}>
            Noch keine Rezepte im Plan
          </p>
          <p style={{ color: "#8A8580", fontSize: "14px", margin: "0 0 20px" }}>
            Weise im Wochenplan Rezepte für die einzelnen Tage zu.
          </p>
          <Link
            href="/plan"
            style={{ display: "inline-block", padding: "12px 24px", background: "#C85D3B", color: "#fff", borderRadius: 14, textDecoration: "none", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
          >
            Zum Wochenplan →
          </Link>
        </div>
      )}

      {/* ── No items for this split ────────────────────────────────── */}
      {!isLoading && !error && data?.hasRecipes && items.length === 0 && (
        <div style={{ ...card, padding: "24px", textAlign: "center" }}>
          <p style={{ color: "#8A8580", fontSize: "14px", margin: 0 }}>
            Für diesen Zeitraum sind keine Rezepte geplant.
          </p>
        </div>
      )}

      {/* ── Summary bar ───────────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'Fraunces', serif", color: "#2D2A26" }}>
              {formatEuro(grandTotal)}
            </div>
            <div style={{ fontSize: "12px", color: "#8A8580", marginTop: 1 }}>
              {items.length} Artikel · {byShop.size} Läden
            </div>
          </div>
          {checkedCount > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#5A8A5E" }}>
                {formatEuro(remainingTotal)} übrig
              </div>
              <div style={{ fontSize: "12px", color: "#8A8580" }}>
                {checkedCount} abgehakt ({formatEuro(checkedTotal)})
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Shop groups (ordered: Aldi → Supermarkt → Metzger → Vorrat) ── */}
      {[
        ...SHOP_ORDER.filter((s) => byShop.has(s)),
        ...[...byShop.keys()].filter((s) => !SHOP_ORDER.includes(s as ShopName)),
      ].map((shop) => {
        const shopItems = byShop.get(shop)!;
        const style = SHOP_STYLE[shop as ShopName] ?? SHOP_STYLE.Supermarkt;
        const shopTotal    = shopItems.reduce((s, i) => s + i.totalPrice, 0);
        const allChecked   = shopItems.every((i) => checked.has(i.key));
        const someChecked  = shopItems.some((i) => checked.has(i.key));
        const doneCount    = shopItems.filter((i) => checked.has(i.key)).length;

        return (
          <div key={shop}>
            {/* Shop header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: "14px 14px 0 0",
                marginBottom: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "16px" }}>{style.emoji}</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: style.color, fontFamily: "'Fraunces', serif" }}>
                  {shop}
                </span>
                {someChecked && (
                  <span style={{ fontSize: "12px", color: style.color, opacity: 0.7 }}>
                    {doneCount}/{shopItems.length}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: style.color }}>
                  {formatEuro(shopTotal)}
                </span>
                <button
                  onClick={() => checkAllInShop(shop, !allChecked)}
                  style={{ fontSize: "11px", padding: "4px 10px", background: "rgba(255,255,255,0.6)", border: `1px solid ${style.border}`, borderRadius: 8, color: style.color, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                >
                  {allChecked ? "Alle ab" : "Alle an"}
                </button>
              </div>
            </div>

            {/* Shop items */}
            <div
              style={{
                background: "#fff",
                border: `1px solid ${style.border}`,
                borderTop: "none",
                borderRadius: "0 0 14px 14px",
                overflow: "hidden",
              }}
            >
              {shopItems.map((item, idx) => {
                const isChecked  = checked.has(item.key);
                const isExpanded = expanded.has(item.key);
                const isLast     = idx === shopItems.length - 1;

                return (
                  <div
                    key={item.key}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid #F5EDE6",
                      opacity: isChecked ? 0.45 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Main row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCheck(item.key)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          border: `2px solid ${isChecked ? "#5A8A5E" : "#E8E2DA"}`,
                          background: isChecked ? "#5A8A5E" : "#fff",
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: 700,
                          transition: "all 0.15s",
                        }}
                        aria-label={isChecked ? "Abhaken rückgängig" : "Abhaken"}
                      >
                        {isChecked ? "✓" : ""}
                      </button>

                      {/* Amount + name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#2D2A26", textDecoration: isChecked ? "line-through" : "none" }}>
                            {formatAmount(item.totalAmount)} {item.unit}
                          </span>
                          <span style={{ fontSize: "15px", color: "#2D2A26", textDecoration: isChecked ? "line-through" : "none" }}>
                            {item.ingredientName}
                          </span>
                          {item.bio && (
                            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: 999, background: "#F0FDF4", color: "#14532D", border: "1px solid #BBF7D0", fontWeight: 600 }}>
                              Bio
                            </span>
                          )}
                        </div>

                        {/* For-days summary (collapsed) */}
                        {!isExpanded && (
                          <button
                            onClick={() => toggleExpand(item.key)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                          >
                            <span style={{ fontSize: "12px", color: "#8A8580" }}>
                              {item.forDays.length === 1
                                ? `${item.forDays[0].dayName.slice(0, 2)}: ${item.forDays[0].recipeName}`
                                : `${item.forDays.map((d) => d.dayName.slice(0, 2)).join(", ")} · ${item.forDays.length}× benötigt`}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Price + expand toggle */}
                      <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D2A26" }}>
                          {formatEuro(item.totalPrice)}
                        </span>
                        {item.forDays.length > 1 && (
                          <button
                            onClick={() => toggleExpand(item.key)}
                            style={{ fontSize: "10px", color: "#8A8580", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            {isExpanded ? "▲ weniger" : "▼ mehr"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: per-day breakdown */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 14px 12px 50px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {item.forDays.map((fd, i) => (
                          <div
                            key={i}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: "#8A8580" }}
                          >
                            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#F5EDE6", color: "#C85D3B", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {fd.dayName.slice(0, 2)}
                            </span>
                            <span>{fd.recipeName}</span>
                          </div>
                        ))}
                        <button
                          onClick={() => toggleExpand(item.key)}
                          style={{ alignSelf: "flex-start", fontSize: "11px", color: "#8A8580", background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginTop: 2 }}
                        >
                          ▲ schließen
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Bottom spacing ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{ ...card, padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#8A8580" }}>Gesamt</span>
            <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'Fraunces', serif", color: "#2D2A26" }}>
              {formatEuro(grandTotal)}
            </span>
          </div>
          {[...byShop.entries()].map(([shop, shopItems]) => (
            <div key={shop} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8A8580", marginTop: 6 }}>
              <span>{shop}</span>
              <span>{formatEuro(shopItems.reduce((s, i) => s + i.totalPrice, 0))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
