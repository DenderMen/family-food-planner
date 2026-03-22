# 🍽️ Family Dinner Planner – Setup-Anleitung

## Voraussetzungen

Du brauchst diese 4 Accounts (alle kostenlos erstellbar, bis auf Claude):

| Account | URL | Wofür | Kosten |
|---------|-----|-------|--------|
| **Claude Pro/Max** | claude.ai | Claude Code Zugang | ab $20/Mo |
| **Supabase** | supabase.com | Datenbank + Auth | Free Tier |
| **Google Cloud** | console.cloud.google.com | Calendar API | Kostenlos |
| **Anthropic Console** | console.anthropic.com | Claude API Key | Pay-per-use (~1€/Mo) |
| **Vercel** | vercel.com | Hosting | Free Tier |
| **GitHub** | github.com | Code-Repository | Free |

---

## Schritt 1: Claude Code installieren

### macOS / Linux
```bash
# Native Installer (empfohlen, kein Node.js nötig)
curl -fsSL https://claude.ai/install.sh | sh
```

### Windows
Zuerst Git for Windows installieren: https://git-scm.com/download/win
Dann in PowerShell:
```powershell
irm https://claude.ai/install.ps1 | iex
```

### Prüfen ob es funktioniert
```bash
claude --version
```

### Einloggen
```bash
claude
# → Browser öffnet sich → mit deinem Claude Pro/Max Account einloggen
```

---

## Schritt 2: Supabase Projekt erstellen

1. Gehe zu **supabase.com** → "Start your project"
2. Erstelle ein neues Projekt (Region: **eu-central-1** für Aachen)
3. Merke dir das **Database Password**!
4. Warte bis das Projekt bereit ist (~2 Min)
5. Gehe zu **Settings → API** und kopiere:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
6. Gehe zu **Settings → Database** und kopiere:
   - Connection string (Transaction) → `DATABASE_URL`
7. Gehe zu **SQL Editor** und füge den Inhalt von `supabase/schema.sql` ein → Run

---

## Schritt 3: Google Calendar API einrichten

1. Gehe zu **console.cloud.google.com**
2. Erstelle ein neues Projekt: "Family Dinner Planner"
3. Navigiere zu **APIs & Services → Library**
4. Suche "Google Calendar API" → **Enable**
5. Gehe zu **APIs & Services → Credentials**
6. Klicke **Create Credentials → OAuth 2.0 Client ID**
7. Application type: **Web application**
8. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
9. Kopiere **Client ID** und **Client Secret**

---

## Schritt 4: Claude API Key erstellen

1. Gehe zu **console.anthropic.com**
2. Erstelle einen API Key
3. Kopiere den Key → `ANTHROPIC_API_KEY`

---

## Schritt 5: Projekt aufsetzen mit Claude Code

Jetzt kommt der spannende Teil! Öffne dein Terminal:

```bash
# 1. Projekt-Ordner erstellen
mkdir family-dinner-planner
cd family-dinner-planner

# 2. Starter-Kit Dateien reinkopieren:
#    - CLAUDE.md
#    - package.json
#    - .env.example
#    - .gitignore
#    - supabase/schema.sql

# 3. Environment Variables einrichten
cp .env.example .env.local
# → .env.local öffnen und alle Werte ausfüllen

# 4. Git initialisieren
git init
git add .
git commit -m "Init: Starter-Kit mit CLAUDE.md"

# 5. Claude Code starten!
claude
```

---

## Schritt 6: Die Befehle für Claude Code

Sobald Claude Code läuft, sagst du einfach in natürlicher Sprache, was du willst. Claude Code liest automatisch die CLAUDE.md und kennt das gesamte Projekt.

### Phase 1: Projekt bootstrappen
Sage Claude Code:
```
Bootstrappe das Next.js 15 Projekt laut CLAUDE.md.
Installiere alle Dependencies aus package.json.
Richte Tailwind CSS 4 und shadcn/ui ein.
Erstelle die Basis-Ordnerstruktur laut Spec.
```

### Phase 2: Datenbank-Anbindung
```
Richte Drizzle ORM ein mit dem Supabase Schema.
Erstelle die Drizzle-Schema-Dateien für alle 8 Tabellen.
Baue den Supabase Auth Flow mit @supabase/ssr.
```

### Phase 3: Rezept-Feature
```
Baue die Rezept-Datenbank:
- API Routes: GET/POST/PUT/DELETE /api/recipes
- Rezept-Übersichtsseite mit Filtern (Saison, Kategorie, Zeit, Kosten)
- Rezept-Detailseite mit Zutaten, Thermomix-Steps, Stillzeit-Info
- Rezept anlegen/bearbeiten Formular
```

### Phase 4: Wochenplan
```
Baue den Wochenplan-Editor:
- 7-Tage-Grid mit Drag & Drop (oder Auswahl per Klick)
- Live Budget-Tracker (150€ Limit)
- Rezepte aus der Bibliothek zuweisen
- Warm/Abendbrot Typ pro Tag
```

### Phase 5: Einkaufsliste
```
Baue die automatische Einkaufsliste:
- Generiert aus dem Wochenplan
- Sortiert nach Laden (Aldi → REWE → Edeka → Metzger)
- Split in 2 Einkäufe (Mo-Do / Fr-So)
- Items abhakbar (Checkbox)
- Zeigt welches Rezept die Zutat braucht
```

### Phase 6: Google Calendar
```
Baue den Google Calendar Sync:
- OAuth2 Login Flow
- POST /api/calendar/sync
- Erstellt 7 Events pro Woche
- Emoji-Titel: "🍝 Bolognese mit Spaghetti"
- Zutaten in der Beschreibung
- 1h Erinnerung vorher
```

### Phase 7: Kinder-Dashboard
```
Baue das Kinder-Dashboard:
- Große bunte Karten für jeden Tag
- Riesige Emojis pro Gericht
- Wochentag-Namen ausgeschrieben
- Mobile-first, simpel und fröhlich
```

### Phase 8: AI Rezeptvorschläge
```
Baue die Claude AI Integration:
- POST /api/suggest
- Nimmt Familienprofil, aktuelle Saison, Budget-Rest
- Gibt personalisierte Rezeptvorschläge zurück
- Zeigt Vorschläge als Karten an
```

---

## Tipps für Claude Code

### Plan Mode nutzen
Drücke **Shift+Tab** bevor du einen komplexen Befehl gibst.
Claude Code erstellt dann erst einen Plan, bevor es Code schreibt.

### Zwischen Features committen
Sage nach jeder Phase:
```
Committe die Änderungen mit einer passenden deutschen Commit-Message.
```

### Fehler beheben
Wenn etwas nicht kompiliert, sage einfach:
```
Es gibt einen Fehler. Bitte analysiere und behebe ihn.
```

### Testen
```
Starte den Dev-Server und prüfe ob alles funktioniert.
```

### Auf Vercel deployen
```
Richte das Projekt für Vercel ein und deploye es.
```

---

## Ordnerstruktur (Ziel)

```
family-dinner-planner/
├── CLAUDE.md
├── package.json
├── .env.local
├── .gitignore
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Register
│   │   ├── (app)/           # Authenticated Routes
│   │   │   ├── dashboard/   # Wochenplan-Übersicht
│   │   │   ├── plan/        # Wochenplan Editor
│   │   │   ├── recipes/     # Rezept-Bibliothek
│   │   │   ├── shopping/    # Einkaufslisten
│   │   │   ├── kids/        # Kinder-Dashboard
│   │   │   └── settings/    # Familienprofil
│   │   └── api/             # API Routes
│   ├── components/          # UI + Feature Components
│   ├── lib/                 # Supabase, Drizzle, Utils
│   ├── hooks/               # Custom React Hooks
│   └── store/               # Zustand Stores
├── supabase/
│   └── schema.sql           # DB Schema
└── public/                  # Icons, PWA Manifest
```

---

## Fragen?

Falls du nicht weiterkommst:
- In Claude Code: `/help` zeigt alle Befehle
- In Claude Code: `/bug` meldet Probleme
- Offizielle Docs: https://code.claude.com/docs
- Oder frag mich hier in claude.ai!
