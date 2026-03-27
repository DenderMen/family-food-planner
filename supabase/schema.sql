-- ═══════════════════════════════════════════
-- Family Dinner Planner – Supabase Schema v1.0
-- ═══════════════════════════════════════════
-- Dieses SQL in den Supabase SQL Editor einfügen und ausführen.

-- Enums
-- meal_type wurde zu TEXT migriert (kein Enum-Constraint mehr)
CREATE TYPE meal_category AS ENUM ('fleisch', 'fisch', 'vegetarisch', 'abendbrot');
CREATE TYPE season AS ENUM ('frühling', 'sommer', 'herbst', 'winter');
CREATE TYPE shop_name AS ENUM ('REWE', 'Edeka', 'Aldi', 'Metzger', 'Vorrat');
CREATE TYPE plan_status AS ENUM ('draft', 'planned', 'active', 'completed');

-- ─── Families ────────────────────────────
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  shopping    JSONB NOT NULL DEFAULT '{}',
  equipment   TEXT[] DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Family Members ──────────────────────
CREATE TABLE family_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID REFERENCES families(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  birth_date     TEXT,
  emoji          TEXT DEFAULT '👤',
  role           TEXT NOT NULL CHECK (role IN ('parent', 'child', 'baby')),
  age_group      TEXT NOT NULL CHECK (age_group IN ('adult', 'child', 'toddler', 'baby')),
  portion_factor NUMERIC DEFAULT 1.0,
  is_nursing     BOOLEAN DEFAULT false,
  is_main_cook   BOOLEAN DEFAULT false,
  allergies      TEXT[] DEFAULT '{}',
  dislikes       TEXT[] DEFAULT '{}',
  dietary_needs  JSONB DEFAULT '[]',
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ─── Recipes ─────────────────────────────
CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID REFERENCES families(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  type            TEXT NOT NULL,        -- 'abendessen' | 'abendbrot'
  category        meal_category NOT NULL,
  tags            TEXT[] DEFAULT '{}',
  seasons         season[] DEFAULT '{}',
  prep_time       INTEGER NOT NULL CHECK (prep_time >= 0),
  cook_time       INTEGER NOT NULL CHECK (cook_time >= 0),
  total_time      INTEGER NOT NULL CHECK (total_time <= 45),
  estimated_cost  NUMERIC NOT NULL,
  steps           JSONB NOT NULL DEFAULT '[]',
  thermomix_steps JSONB DEFAULT '[]',
  child_adaptions JSONB DEFAULT '{}',
  nursing_boost   TEXT,
  nutrition       JSONB DEFAULT '{}',
  servings        JSONB DEFAULT '{}',
  is_favorite     BOOLEAN DEFAULT false,
  source          TEXT,
  image_url       TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_id, slug)
);

-- ─── Ingredients (per Recipe) ────────────
CREATE TABLE ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  unit            TEXT NOT NULL,
  category        TEXT NOT NULL,
  preferred_shop  shop_name DEFAULT 'REWE',
  estimated_price NUMERIC NOT NULL DEFAULT 0,
  bio             BOOLEAN DEFAULT false,
  regional        BOOLEAN DEFAULT false,
  is_optional     BOOLEAN DEFAULT false,
  is_basic        BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0
);

CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);

-- ─── Week Plans ──────────────────────────
CREATE TABLE week_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID REFERENCES families(id) ON DELETE CASCADE,
  week_id      TEXT NOT NULL,
  year         INTEGER NOT NULL,
  week_number  INTEGER NOT NULL,
  budget_limit NUMERIC DEFAULT 150,
  status       plan_status DEFAULT 'draft',
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_id, week_id)
);

-- ─── Day Plans (7 per Week) ──────────────
CREATE TABLE day_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id   UUID REFERENCES week_plans(id) ON DELETE CASCADE,
  day_of_week    INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  date           TEXT NOT NULL,
  recipe_id      UUID REFERENCES recipes(id),
  type           TEXT,                  -- 'abendessen' | 'abendbrot'
  guest_count    INTEGER DEFAULT 0,
  scale_factor   NUMERIC DEFAULT 1.0,
  notes          TEXT DEFAULT '',
  skipped        BOOLEAN DEFAULT false,
  estimated_cost NUMERIC DEFAULT 0,
  UNIQUE(week_plan_id, day_of_week)
);

-- ─── Shopping Lists ──────────────────────
CREATE TABLE shopping_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id    UUID REFERENCES week_plans(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  target_date     TEXT,
  covers_days     INTEGER[] DEFAULT '{}',
  total_estimated NUMERIC DEFAULT 0,
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  unit            TEXT NOT NULL,
  shop            shop_name NOT NULL,
  estimated_price NUMERIC DEFAULT 0,
  actual_price    NUMERIC,
  for_recipes     TEXT[] DEFAULT '{}',
  checked         BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0
);

CREATE INDEX idx_shopping_items_list ON shopping_items(list_id);

-- ─── Row Level Security ──────────────────
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Policies: Familien sehen nur ihre eigenen Daten
CREATE POLICY "families_own" ON families
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "members_own" ON family_members
  FOR ALL USING (family_id IN (SELECT id FROM families WHERE owner_id = auth.uid()));

CREATE POLICY "recipes_own" ON recipes
  FOR ALL USING (family_id IN (SELECT id FROM families WHERE owner_id = auth.uid()));

CREATE POLICY "ingredients_own" ON ingredients
  FOR ALL USING (recipe_id IN (
    SELECT r.id FROM recipes r
    JOIN families f ON r.family_id = f.id
    WHERE f.owner_id = auth.uid()
  ));

CREATE POLICY "plans_own" ON week_plans
  FOR ALL USING (family_id IN (SELECT id FROM families WHERE owner_id = auth.uid()));

CREATE POLICY "days_own" ON day_plans
  FOR ALL USING (week_plan_id IN (
    SELECT wp.id FROM week_plans wp
    JOIN families f ON wp.family_id = f.id
    WHERE f.owner_id = auth.uid()
  ));

CREATE POLICY "shopping_lists_own" ON shopping_lists
  FOR ALL USING (week_plan_id IN (
    SELECT wp.id FROM week_plans wp
    JOIN families f ON wp.family_id = f.id
    WHERE f.owner_id = auth.uid()
  ));

CREATE POLICY "shopping_items_own" ON shopping_items
  FOR ALL USING (list_id IN (
    SELECT sl.id FROM shopping_lists sl
    JOIN week_plans wp ON sl.week_plan_id = wp.id
    JOIN families f ON wp.family_id = f.id
    WHERE f.owner_id = auth.uid()
  ));
