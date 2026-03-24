"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateImage } from "@/lib/generate-image";
import { getWeekId } from "@/lib/utils";
import type { SettingsResponse } from "@/app/api/settings/route";
import type { SyncResponse } from "@/app/api/calendar/sync/route";
import type { CalendarsResponse, CalendarItem } from "@/app/api/calendar/calendars/route";
import type { MemberResponse, MembersListResponse } from "@/app/api/members/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: SyncResponse }
  | { status: "error"; message: string };

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Fehler");
  return res.json();
}

async function fetchCalendars(): Promise<CalendarsResponse> {
  const res = await fetch("/api/calendar/calendars");
  if (!res.ok) throw new Error("Fehler beim Laden der Kalender");
  return res.json();
}

async function saveCalendar(calendarId: string): Promise<void> {
  const res = await fetch("/api/calendar/calendars", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  });
  if (!res.ok) throw new Error("Fehler beim Speichern");
}

async function disconnectGoogle(): Promise<void> {
  const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
  if (!res.ok) throw new Error("Fehler beim Trennen");
}

async function syncCalendar(weekId: string): Promise<SyncResponse> {
  const res = await fetch("/api/calendar/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Fehler beim Sync");
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const currentWeekId = getWeekId();
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [calendarSaved, setCalendarSaved] = useState(false);
  const [imgGenRunning, setImgGenRunning] = useState(false);
  const [imgGenProgress, setImgGenProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const connected = settings?.googleCalendar?.connected ?? false;

  // Only fetch calendar list when connected
  const { data: calendarsData, isLoading: calendarsLoading } = useQuery({
    queryKey: ["calendars"],
    queryFn: fetchCalendars,
    enabled: connected,
  });

  // Auto-select "Familie" or previously saved calendarId when data arrives
  useEffect(() => {
    if (!calendarsData) return;

    // If user already had a saved selection, use it
    if (calendarsData.selectedCalendarId && calendarsData.selectedCalendarId !== "primary") {
      setSelectedCalendarId(calendarsData.selectedCalendarId);
      return;
    }

    // Auto-detect "Familie" calendar
    const familiar = calendarsData.calendars.find(
      (c) => c.summary.toLowerCase().includes("familie")
    );
    if (familiar) {
      setSelectedCalendarId(familiar.id);
      // Persist the auto-selection
      saveCalendar(familiar.id).catch(() => null);
    } else {
      // Fall back to primary
      const primary = calendarsData.calendars.find((c) => c.primary);
      setSelectedCalendarId(primary?.id ?? "primary");
    }
  }, [calendarsData]);

  const saveCalendarMut = useMutation({
    mutationFn: saveCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setCalendarSaved(true);
      setTimeout(() => setCalendarSaved(false), 2000);
    },
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
      setSelectedCalendarId("");
    },
  });

  async function handleSync() {
    setSyncState({ status: "loading" });
    try {
      const result = await syncCalendar(currentWeekId);
      setSyncState({ status: "success", result });
    } catch (err) {
      setSyncState({ status: "error", message: err instanceof Error ? err.message : "Fehler" });
    }
  }

  function handleCalendarChange(calendarId: string) {
    setSelectedCalendarId(calendarId);
    saveCalendarMut.mutate(calendarId);
  }

  async function handleGenerateMissingImages() {
    if (imgGenRunning) return;
    const res = await fetch("/api/recipes");
    if (!res.ok) return;
    const all: Array<{ id: string; name: string; imageUrl: string | null; type: string; category: string; prepTime: number; cookTime: number; estimatedCost: string; isFavorite: boolean; nursingBoost: string | null; steps: string[]; ingredients: unknown[] }> = await res.json();
    const missing = all.filter((r) => !r.imageUrl);
    if (missing.length === 0) {
      setImgGenProgress({ done: 0, total: 0 });
      return;
    }
    setImgGenRunning(true);
    setImgGenProgress({ done: 0, total: missing.length });
    for (let i = 0; i < missing.length; i++) {
      const recipe = missing[i];
      const url = await generateImage(recipe.name);
      if (url) {
        await fetch(`/api/recipes/${recipe.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...recipe, imageUrl: url }),
        });
      }
      setImgGenProgress({ done: i + 1, total: missing.length });
    }
    setImgGenRunning(false);
    queryClient.invalidateQueries({ queryKey: ["recipes"] });
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E8E2DA",
    boxShadow: "0 1px 4px rgba(45,42,38,0.06)",
    padding: "18px 20px",
  };

  const btn = (bg: string, color = "#fff"): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "14px 16px",
    background: bg,
    color,
    border: "none",
    borderRadius: 12,
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "opacity 0.2s",
  });

  // Find the selected calendar's display name
  const selectedCalendar: CalendarItem | undefined = calendarsData?.calendars.find(
    (c) => c.id === selectedCalendarId
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", fontWeight: 600, color: "#2D2A26", margin: 0 }}>
        Einstellungen
      </h1>

      {/* ── Google Calendar ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F8F9FA", border: "1px solid #E8E2DA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26" }}>Google Kalender</div>
            <div style={{ fontSize: "13px", color: "#8A8580", marginTop: 2 }}>
              Wochenplan automatisch als Ereignisse eintragen
            </div>
          </div>
        </div>

        {/* Status badge */}
        {isLoading ? (
          <div style={{ height: 32, background: "#F5EDE6", borderRadius: 8, marginBottom: 14 }} />
        ) : (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            background: connected ? "rgba(90,138,94,0.1)" : "rgba(138,133,128,0.1)",
            border: `1px solid ${connected ? "rgba(90,138,94,0.3)" : "#E8E2DA"}`,
            marginBottom: 16,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#5A8A5E" : "#8A8580", display: "block", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: connected ? "#3D6B41" : "#8A8580" }}>
              {connected ? "Verbunden" : "Nicht verbunden"}
            </span>
          </div>
        )}

        {/* Not connected */}
        {!isLoading && !connected && (
          <a
            href="/api/auth/google"
            style={{ ...btn("#4285F4"), textDecoration: "none" }}
          >
            <span>🔗</span> Mit Google verbinden
          </a>
        )}

        {/* Connected */}
        {!isLoading && connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── Calendar selector ─────────────────────────────────── */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#2D2A26", marginBottom: 6 }}>
                Ziel-Kalender
              </div>

              {calendarsLoading ? (
                <div style={{ height: 44, background: "#F5EDE6", borderRadius: 10 }} />
              ) : calendarsData && calendarsData.calendars.length > 0 ? (
                <div style={{ position: "relative" }}>
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => handleCalendarChange(e.target.value)}
                    disabled={saveCalendarMut.isPending}
                    style={{
                      width: "100%",
                      padding: "11px 36px 11px 12px",
                      background: "#FAF6F1",
                      border: `1px solid ${calendarSaved ? "rgba(90,138,94,0.5)" : "#E8E2DA"}`,
                      borderRadius: 10,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#2D2A26",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {calendarsData.calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.primary ? `${cal.summary} (primär)` : cal.summary}
                      </option>
                    ))}
                  </select>
                  {/* Arrow icon */}
                  <span style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    pointerEvents: "none", fontSize: "12px", color: "#8A8580",
                  }}>▼</span>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#8A8580", padding: "10px 0" }}>
                  Keine Kalender gefunden.
                </div>
              )}

              {/* Save feedback */}
              <div style={{ height: 18, marginTop: 4 }}>
                {saveCalendarMut.isPending && (
                  <span style={{ fontSize: "11px", color: "#8A8580" }}>Wird gespeichert…</span>
                )}
                {calendarSaved && (
                  <span style={{ fontSize: "11px", color: "#5A8A5E", fontWeight: 600 }}>
                    ✓ Kalender gespeichert
                    {selectedCalendar ? ` → ${selectedCalendar.summary}` : ""}
                  </span>
                )}
                {/* Auto-selected hint */}
                {!calendarSaved && !saveCalendarMut.isPending && selectedCalendar && (
                  <span style={{ fontSize: "11px", color: "#8A8580" }}>
                    {calendarsData?.calendars.find(
                      (c) => c.summary.toLowerCase().includes("familie") && c.id === selectedCalendarId
                    ) ? "✨ «Familie»-Kalender automatisch erkannt" : `Aktiver Kalender: ${selectedCalendar.summary}`}
                  </span>
                )}
              </div>
            </div>

            {/* ── Sync button ───────────────────────────────────────── */}
            <button
              onClick={handleSync}
              disabled={syncState.status === "loading"}
              style={{
                ...btn("#C85D3B"),
                opacity: syncState.status === "loading" ? 0.6 : 1,
                cursor: syncState.status === "loading" ? "wait" : "pointer",
                boxShadow: "0 3px 10px rgba(200,93,59,0.3)",
              }}
            >
              {syncState.status === "loading" ? (
                <>⏳ Wird synchronisiert…</>
              ) : (
                <>📅 Wochenplan in Kalender exportieren</>
              )}
            </button>

            {/* Sync result */}
            {syncState.status === "success" && (
              <div style={{ background: "rgba(90,138,94,0.1)", border: "1px solid rgba(90,138,94,0.3)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#3D6B41", marginBottom: 4 }}>
                  ✅ Sync erfolgreich!
                </div>
                <div style={{ fontSize: "13px", color: "#3D6B41" }}>
                  {syncState.result.created} Ereignis{syncState.result.created !== 1 ? "se" : ""} erstellt
                  {syncState.result.skipped > 0 && `, ${syncState.result.skipped} übersprungen`}
                  {selectedCalendar && ` → ${selectedCalendar.summary}`}
                </div>
                {syncState.result.errors.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: "12px", color: "#7B2D2D" }}>
                    {syncState.result.errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
                  </div>
                )}
              </div>
            )}

            {syncState.status === "error" && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", fontSize: "14px", color: "#991B1B" }}>
                ❌ {syncState.message}
              </div>
            )}

            {/* Disconnect */}
            <button
              onClick={() => disconnectMut.mutate()}
              disabled={disconnectMut.isPending}
              style={{
                ...btn("transparent", "#8A8580"),
                border: "1px solid #E8E2DA",
                opacity: disconnectMut.isPending ? 0.5 : 1,
                cursor: disconnectMut.isPending ? "wait" : "pointer",
              }}
            >
              {disconnectMut.isPending ? "Wird getrennt…" : "🔌 Verbindung trennen"}
            </button>
          </div>
        )}
      </div>

      {/* ── AI Image Generation ─────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F5F3FF", border: "1px solid #DDD6FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
            🎨
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26" }}>Rezeptbilder generieren</div>
            <div style={{ fontSize: "13px", color: "#8A8580", marginTop: 2 }}>
              KI-Fotos für Rezepte ohne Bild erstellen (Puter.js, kostenlos)
            </div>
          </div>
        </div>

        {imgGenProgress !== null && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#4A4540", marginBottom: 6 }}>
              <span>{imgGenProgress.total === 0 ? "Alle Rezepte haben bereits ein Bild ✓" : `${imgGenProgress.done} / ${imgGenProgress.total} generiert`}</span>
              {imgGenProgress.total > 0 && !imgGenRunning && imgGenProgress.done === imgGenProgress.total && (
                <span style={{ color: "#5A8A5E", fontWeight: 600 }}>Fertig!</span>
              )}
            </div>
            {imgGenProgress.total > 0 && (
              <div style={{ height: 6, background: "#F5EDE6", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#7B6BA4", borderRadius: 999, width: `${Math.round((imgGenProgress.done / imgGenProgress.total) * 100)}%`, transition: "width 0.3s ease" }} />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleGenerateMissingImages}
          disabled={imgGenRunning}
          style={{ ...btn("#7B6BA4"), opacity: imgGenRunning ? 0.6 : 1, cursor: imgGenRunning ? "wait" : "pointer" }}
        >
          {imgGenRunning ? "⏳ Bilder werden generiert…" : "🎨 Fehlende Rezeptbilder generieren"}
        </button>
      </div>

      {/* ── Info card ───────────────────────────────────────────────── */}
      <div style={{ ...card, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#92400E", marginBottom: 8 }}>💡 Wie es funktioniert</div>
        <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: "13px", color: "#78350F", lineHeight: 1.8 }}>
          <li>Jedes Rezept wird als Kalender-Ereignis um 17:30 Uhr eingetragen</li>
          <li>60 Min vorher: Erinnerung „Einkaufen / Auftauen!"</li>
          <li>10 Min vorher: Erinnerung „Kochen starten!"</li>
          <li>Zutaten werden als Beschreibung eingefügt</li>
          <li>Alle Ereignisse erscheinen in Blau</li>
        </ul>
      </div>

      {/* ── Family member preferences ──────────────────────────────── */}
      <MemberPrefsSection card={card} />

      {/* ── Budget info ─────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 8 }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26", marginBottom: 12 }}>💰 Budget & Einkauf</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "13px", color: "#4A4540" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Wochenbudget</span>
            <span style={{ fontWeight: 700, color: "#C85D3B" }}>150,00 €</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Einkäufe pro Woche</span>
            <span style={{ fontWeight: 600 }}>2×</span>
          </div>
          <div style={{ height: 1, background: "#F5EDE6", margin: "4px 0" }} />
          <div style={{ fontSize: "12px", color: "#8A8580" }}>
            Mo + Do/Fr · Aldi · Supermarkt · Metzger (Aachen)
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Member Preferences Section ───────────────────────────────────────────────

async function fetchMembers(): Promise<MembersListResponse> {
  const res = await fetch("/api/members");
  if (!res.ok) throw new Error("Fehler");
  return res.json();
}

async function saveMemberPrefs(id: string, prefs: {
  likes: string[];
  dislikes: string[];
  allergies: string[];
  dietaryNeeds: string[];
}) {
  const res = await fetch(`/api/members/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error("Fehler beim Speichern");
}

function MemberPrefsSection({ card }: { card: React.CSSProperties }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const saveMut = useMutation({
    mutationFn: ({ id, prefs }: { id: string; prefs: Parameters<typeof saveMemberPrefs>[1] }) =>
      saveMemberPrefs(id, prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const seedMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/seed-members", { method: "POST" });
      if (!res.ok) throw new Error("Fehler beim Anlegen");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif" }}>
          👨‍👩‍👦‍👦 Familien-Vorlieben
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...card, padding: "14px 16px", height: 80, opacity: 1 - i * 0.25 }}>
            <div style={{ height: "100%", background: "#F5EDE6", borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  const members = data?.members ?? [];
  const hasDbMembers = members.length > 0;

  if (!hasDbMembers) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif" }}>
          👨‍👩‍👦‍👦 Familien-Vorlieben
        </div>
        <div style={{ ...card, padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: 12 }}>👨‍👩‍👦‍👦</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#2D2A26", marginBottom: 6, fontFamily: "'Fraunces', serif" }}>
            Familienmitglieder noch nicht angelegt
          </div>
          <div style={{ fontSize: "13px", color: "#8A8580", marginBottom: 20, lineHeight: 1.5 }}>
            Lege Dennis, Kaja, Theo, Carlo und Paulo mit ihren Startvorlieben in der Datenbank an.
            Danach kannst du Vorlieben, Abneigungen und Bedürfnisse pflegen.
          </div>
          <button
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            style={{
              padding: "12px 24px",
              background: seedMut.isPending ? "#E8D5C8" : "#C85D3B",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: "15px",
              fontWeight: 600,
              cursor: seedMut.isPending ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 3px 10px rgba(200,93,59,0.3)",
            }}
          >
            {seedMut.isPending ? "Wird angelegt…" : "👨‍👩‍👦‍👦 Familie anlegen"}
          </button>
          {seedMut.isError && (
            <div style={{ marginTop: 12, fontSize: "13px", color: "#991B1B" }}>
              Fehler beim Anlegen. Bitte nochmal versuchen.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D2A26", fontFamily: "'Fraunces', serif" }}>
          👨‍👩‍👦‍👦 Familien-Vorlieben
        </div>
        <div style={{ fontSize: "12px", color: "#8A8580" }}>
          Wird von der KI-Vorschlagsfunktion verwendet
        </div>
      </div>
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          card={card}
          onSave={(prefs) => saveMut.mutate({ id: member.id, prefs })}
          saving={saveMut.isPending}
        />
      ))}
    </div>
  );
}

// ─── Single member card ───────────────────────────────────────────────────────

interface TagFieldProps {
  label: string;
  color: string;
  bg: string;
  border: string;
  tags: string[];
  canEdit: boolean;
  onChange: (tags: string[]) => void;
}

function TagField({ label, color, bg, border, tags, canEdit, onChange }: TagFieldProps) {
  const [input, setInput] = useState("");

  function addTag() {
    const val = input.trim();
    if (!val || tags.includes(val)) { setInput(""); return; }
    onChange([...tags, val]);
    setInput("");
  }

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: canEdit ? 6 : 0 }}>
        {tags.length === 0 && !canEdit && (
          <span style={{ fontSize: "12px", color: "#C0BAB4", fontStyle: "italic" }}>keine</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "12px", padding: "3px 10px", borderRadius: 999,
              background: bg, color, border: `1px solid ${border}`,
              display: "flex", alignItems: "center", gap: 5, fontWeight: 500,
            }}
          >
            {tag}
            {canEdit && (
              <button
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: "13px", padding: "0 1px", lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {canEdit && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder={`${label} hinzufügen…`}
            style={{
              flex: 1, padding: "7px 11px", background: "#FAF6F1",
              border: `1px solid ${border}`, borderRadius: 8,
              fontSize: "13px", color: "#2D2A26", outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            onClick={addTag}
            style={{
              padding: "7px 12px", background: bg, border: `1px solid ${border}`,
              borderRadius: 8, fontSize: "13px", color, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

interface MemberCardProps {
  member: MemberResponse;
  card: React.CSSProperties;
  onSave: (prefs: { likes: string[]; dislikes: string[]; allergies: string[]; dietaryNeeds: string[] }) => void;
  saving: boolean;
}

function MemberCard({ member, card, onSave, saving }: MemberCardProps) {
  const [likes, setLikes]           = useState<string[]>(member.likes ?? []);
  const [dislikes, setDislikes]     = useState<string[]>(member.dislikes ?? []);
  const [allergies, setAllergies]   = useState<string[]>(member.allergies ?? []);
  const [needs, setNeeds]           = useState<string[]>(member.dietaryNeeds ?? []);
  const [isDirty, setIsDirty]       = useState(false);

  // Reset local state when server data changes
  useEffect(() => {
    setLikes(member.likes ?? []);
    setDislikes(member.dislikes ?? []);
    setAllergies(member.allergies ?? []);
    setNeeds(member.dietaryNeeds ?? []);
    setIsDirty(false);
  }, [member]);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setIsDirty(true); };
  }

  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      {/* Member header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "28px", lineHeight: 1 }}>{member.emoji}</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#2D2A26" }}>{member.name}</div>
            <div style={{ fontSize: "12px", color: "#8A8580" }}>
              {member.role}
              {member.isNursing && " · 🤱 Stillend"}
              {member.isMainCook && " · 👩‍🍳 Hauptkoch"}
            </div>
          </div>
        </div>
        {isDirty && (
          <button
            onClick={() => { onSave({ likes, dislikes, allergies, dietaryNeeds: needs }); setIsDirty(false); }}
            disabled={saving}
            style={{
              padding: "6px 14px", background: "#5A8A5E", color: "#fff",
              border: "none", borderRadius: 8, fontSize: "12px", fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "…" : "Speichern"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TagField
          label="Mag gern"
          color="#14532D" bg="#F0FDF4" border="#BBF7D0"
          tags={likes} canEdit={true}
          onChange={markDirty(setLikes)}
        />
        <TagField
          label="Mag nicht"
          color="#991B1B" bg="#FEF2F2" border="#FECACA"
          tags={dislikes} canEdit={true}
          onChange={markDirty(setDislikes)}
        />
        <TagField
          label="Allergien"
          color="#92400E" bg="#FFFBEB" border="#FDE68A"
          tags={allergies} canEdit={true}
          onChange={markDirty(setAllergies)}
        />
        <TagField
          label="Besondere Bedürfnisse"
          color="#4C1D95" bg="#F5F3FF" border="#DDD6FE"
          tags={needs} canEdit={true}
          onChange={markDirty(setNeeds)}
        />
      </div>
    </div>
  );
}
