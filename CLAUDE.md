# CLAUDE.md – Family Dinner Planner

## Projekt
Familien-Abendessen-Planer (Web-App) für 5 Personen.
Wochenplanung, Rezeptverwaltung, automatische Einkaufslisten,
Google Calendar Sync, Kinder-Dashboard.

## Tech-Stack
- Next.js 15 (App Router) + React 19
- Tailwind CSS 4 + shadcn/ui + Framer Motion
- Supabase: Auth, Postgres DB, Realtime, Storage
- Drizzle ORM (Type-safe DB queries)
- Zustand (UI State) + React Query (Server State)
- Google Calendar API v3 (OAuth2)
- Claude API (Sonnet) für Rezeptvorschläge
- next-pwa (Offline-fähig, installierbar)
- Vercel Hosting (Hobby Plan)

## Familie
- Dennis (40): Fokus gesund & ausgewogen
- Kaja (34): Hauptköchin, voll stillend (+500kcal/Tag, extra Kalzium, Eisen, Omega-3)
- Theo (4): Isst gut, liebt Pasta & Kartoffeln
- Carlo (2): Isst vom Familientisch, sogar mehr als Theo – kein Problem
- Paulo (Baby, geb. Feb 2026): Vollgestilltes Stillkind

## Ernährungs-Regeln
- Budget: 150 EUR/Woche für 7 Abendessen
- Max 30 Min Zubereitungszeit (Kaja kocht meistens, oft mit Kleinkind auf dem Arm)
- 2-3x Fleisch (Rind/Huhn), 1x Fisch (oder Fischstäbchen)
- 2x Abendbrot pro Woche (klassisch: Brot, Aufschnitt, Käse, Gemüse; 1x davon "Premium")
- Kein Meal-Prep – tagesaktuell kochen
- Vermeiden: scharfes Essen (wg. Kids), rohes Fleisch/Mett, Alkohol im Essen
- Bio: bevorzugt, nicht streng
- Regional: gewünscht, flexibel (kein strikter Radius)

## Einkauf
- 2x Großeinkauf pro Woche (z.B. Montag + Donnerstag/Freitag)
- Einkaufsliste automatisch splitten auf 2 Einkäufe
- Läden in Aachen (3 Kategorien):
  - Supermarkt (REWE oder Edeka): Gemüse, Obst, Milch, Käse, Brot, Eier, Sahne, TK-Ware, Konserven
  - Aldi: Günstige Basics (Nudeln, Mehl, Reis, Kartoffeln, Zucker, Öl, Gewürze)
  - Metzger: Fleisch, Hackfleisch, Aufschnitt, Wurst
- Einkaufsliste nach Laden sortieren: Aldi → Supermarkt → Metzger

## Favoriten-Gerichte (Basis-Rezeptpool)
Diese Gerichte funktionieren immer und bilden den Kern:
- Bolognese mit Spaghetti
- Käsespätzle mit Röstzwiebeln
- Kartoffelgratin
- Kartoffeln + Spinat + Fischstäbchen
- Hot Dogs + Pommes
- Pizza

## Coding-Standards
- TypeScript strict mode
- Server Components wo möglich (RSC-first)
- API Routes in src/app/api/
- Drizzle ORM für alle DB-Queries (kein raw SQL im App-Code)
- Supabase Auth mit @supabase/ssr
- Alle Preise in EUR, 2 Dezimalstellen (number, nicht string)
- Deutsche UI-Texte, Code/Variablen auf Englisch
- Mobile-first Design (Kaja nutzt das Handy in der Küche)
- Fraunces (Google Font, serif) für Headlines
- DM Sans (Google Font, sans-serif) für Body Text
- Farbpalette: warme Erdtöne (#C85D3B accent, #5A8A5E green, #7B6BA4 purple)

## Datenbank-Design
- 8 Tabellen: families, family_members, recipes, ingredients, week_plans, day_plans, shopping_lists, shopping_items
- Row Level Security: Jede Familie sieht nur ihre Daten
- Enums: meal_type (abendessen/abendbrot), meal_category (fleisch/fisch/vegetarisch/abendbrot), season, shop_name, plan_status

## Kern-Features (Priorität)
1. Rezept-Datenbank mit CRUD + Zutaten + Stillzeit-Info
2. Wochenplan-Editor mit Budget-Tracking (150€ Limit live)
3. Automatische Einkaufsliste (nach Laden sortiert, 2 Splits)
4. Google Calendar Sync (Events mit Emoji-Titel + Zutaten, blau)
5. Kinder-Dashboard (große Emojis, bunte Karten für Theo & Carlo)
6. Claude AI Rezeptvorschläge (Saison + Budget + Familienprofil)

## Git-Workflow
- Main Branch: production-ready
- Feature Branches: feature/rezept-crud, feature/wochenplan, etc.
- Commit Messages auf Deutsch: "Feat: Rezept-CRUD mit Zutaten"
- Kleine, fokussierte Commits
