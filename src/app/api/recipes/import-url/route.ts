import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamily } from "@/lib/db/get-family";

const client = new Anthropic();

// ─── Prompt: JSON-LD already extracted (most accurate) ────────────────────────

const PROMPT_JSONLD = `Du bekommst strukturierte Rezeptdaten (JSON-LD Schema.org/Recipe) einer Webseite.
Konvertiere sie EXAKT in dieses JSON-Format – übernimm alle Zutatenmengen, Einheiten und Zubereitungsschritte 1:1, nichts weglassen, nichts zusammenfassen.
Antworte NUR mit dem JSON, kein Markdown:

{
  "name": "Rezeptname",
  "type": "abendessen",
  "category": "fleisch|fisch|vegetarisch|abendbrot|snack",
  "prepTime": <Minuten als Zahl>,
  "cookTime": <Minuten als Zahl>,
  "estimatedCost": <Gesamtkosten für 4 Personen in EUR als Zahl>,
  "steps": ["Exakt Schritt 1 aus dem Rezept", "Exakt Schritt 2"],
  "ingredients": [
    {
      "name": "Zutatname",
      "amount": "200",
      "unit": "g",
      "category": "gemüse|fleisch|fisch|milchprodukte|gewürze|sonstiges",
      "preferredShop": "Supermarkt|Aldi|Metzger",
      "estimatedPrice": 0.80,
      "bio": false
    }
  ]
}

Pflichtregeln:
- ALLE Zutaten aus dem Rezept übernehmen, exakte Mengen und Einheiten
- ALLE Zubereitungsschritte übernehmen, nicht kürzen oder zusammenfassen
- category: fleisch wenn Fleisch/Geflügel, fisch wenn Fisch/Meeresfrüchte, sonst vegetarisch
- preferredShop: Fleisch/Wurst → Metzger, Nudeln/Mehl/Reis/Öl/Gewürze → Aldi, sonst → Supermarkt
- estimatedCost: realistische deutsche Supermarktpreise 2025`;

// ─── Prompt: plain text fallback ──────────────────────────────────────────────

const PROMPT_TEXT = `Du siehst den Textinhalt einer Rezept-Webseite.
Extrahiere das Rezept EXAKT – übernimm alle Zutatenmengen und Zubereitungsschritte wortgetreu, nichts weglassen.
Antworte NUR mit dem JSON, kein Markdown:

{
  "name": "Rezeptname",
  "type": "abendessen",
  "category": "fleisch|fisch|vegetarisch|abendbrot|snack",
  "prepTime": <Minuten als Zahl>,
  "cookTime": <Minuten als Zahl>,
  "estimatedCost": <Gesamtkosten für 4 Personen in EUR als Zahl>,
  "steps": ["Exakt Schritt 1", "Exakt Schritt 2"],
  "ingredients": [
    {
      "name": "Zutatname",
      "amount": "200",
      "unit": "g",
      "category": "gemüse|fleisch|fisch|milchprodukte|gewürze|sonstiges",
      "preferredShop": "Supermarkt|Aldi|Metzger",
      "estimatedPrice": 0.80,
      "bio": false
    }
  ]
}

Pflichtregeln:
- ALLE Zutaten mit exakten Mengen und Einheiten übernehmen
- ALLE Zubereitungsschritte vollständig übernehmen, nicht kürzen
- category: fleisch wenn Fleisch/Geflügel, fisch wenn Fisch/Meeresfrüchte, sonst vegetarisch
- preferredShop: Fleisch/Wurst → Metzger, Nudeln/Mehl/Reis/Öl/Gewürze → Aldi, sonst → Supermarkt
- estimatedCost: realistische deutsche Supermarktpreise 2025`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract JSON-LD Recipe schema — most accurate source on recipe sites */
function extractJsonLd(html: string): string | null {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          ("@type" in item) &&
          String((item as Record<string, unknown>)["@type"]).toLowerCase().includes("recipe")
        ) {
          return JSON.stringify(item, null, 2);
        }
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }
  return null;
}

/** Strip HTML to readable plain text, removing scripts/styles/nav noise */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

function extractOgImage(html: string, baseUrl: string): string | null {
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) {
    const u = ogMatch[1];
    return u.startsWith("http") ? u : new URL(u, baseUrl).href;
  }
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (imgMatch?.[1]) {
    const u = imgMatch[1];
    return u.startsWith("http") ? u : new URL(u, baseUrl).href;
  }
  return null;
}

async function downloadAndUpload(
  imageUrl: string,
  familyId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const path = `${familyId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(path, buf, { contentType, upsert: false });

    if (error) return null;
    const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const url: string = body?.url?.trim();
    if (!url || !url.startsWith("http"))
      return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });

    // 1. Fetch HTML
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return NextResponse.json({ error: "Seite nicht erreichbar" }, { status: 400 });
      html = await res.text();
    } catch {
      return NextResponse.json({ error: "Seite konnte nicht geladen werden" }, { status: 400 });
    }

    // 2. Extract og:image + upload
    const supabase = await createClient();
    const ogImageUrl = extractOgImage(html, url);
    const imageUrl = ogImageUrl ? await downloadAndUpload(ogImageUrl, family.id, supabase) : null;

    // 3. Try JSON-LD first (most accurate), fall back to stripped plain text
    const jsonLd = extractJsonLd(html);
    const [prompt, content] = jsonLd
      ? [PROMPT_JSONLD, `URL: ${url}\n\nJSON-LD Rezeptdaten:\n${jsonLd}`]
      : [PROMPT_TEXT,  `URL: ${url}\n\nSeiteninhalt:\n${htmlToText(html).slice(0, 80_000)}`];

    // 4. Claude parse
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: `${prompt}\n\n${content}` }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    let recipe: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      recipe = JSON.parse(cleaned);
    } catch {
      console.error("Claude URL-import JSON parse error:", raw);
      return NextResponse.json({ error: "Rezept konnte nicht erkannt werden" }, { status: 422 });
    }

    return NextResponse.json({ ...recipe, imageUrl });
  } catch (error) {
    console.error("POST /api/recipes/import-url:", error);
    return NextResponse.json({ error: "Import fehlgeschlagen" }, { status: 500 });
  }
}
