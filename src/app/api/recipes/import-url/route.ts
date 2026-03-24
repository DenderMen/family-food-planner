import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamily } from "@/lib/db/get-family";

const client = new Anthropic();

const IMPORT_PROMPT = `Du siehst den HTML-Quellcode einer Rezept-Webseite.
Extrahiere alle Rezeptinformationen und antworte NUR mit einem validen JSON-Objekt (kein Markdown, kein Text):

{
  "name": "Rezeptname auf Deutsch",
  "type": "warm",
  "category": "fleisch|fisch|vegetarisch|abendbrot|snack",
  "prepTime": <Minuten Vorbereitung, Zahl>,
  "cookTime": <Minuten Kochen/Backen, Zahl>,
  "estimatedCost": <geschätzte Kosten in EUR als Zahl, z.B. 8.50>,
  "nursingBoost": null,
  "steps": ["Schritt 1", "Schritt 2"],
  "ingredients": [
    {
      "name": "Zutat",
      "amount": "200",
      "unit": "g",
      "category": "gemüse|fleisch|fisch|milchprodukte|gewürze|sonstiges",
      "preferredShop": "supermarkt|aldi|metzger",
      "estimatedPrice": 0.80,
      "bio": false
    }
  ]
}

Regeln:
- Übersetze den Rezeptnamen ins Deutsche falls nötig
- category: "fleisch" wenn Fleisch/Geflügel, "fisch" wenn Fisch/Meeresfrüchte, "vegetarisch" wenn kein Fleisch/Fisch
- prepTime + cookTime: aus dem Rezept, max 30 Min gesamt empfohlen
- estimatedCost: Schätze Gesamtkosten für 4 Personen in EUR
- preferredShop: Fleisch → metzger, günstige Basics → aldi, sonst → supermarkt
- Antworte AUSSCHLIESSLICH mit dem JSON`;

async function extractOgImage(html: string, baseUrl: string): Promise<string | null> {
  // Try og:image meta tag
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) {
    const url = ogMatch[1];
    return url.startsWith("http") ? url : new URL(url, baseUrl).href;
  }
  // Fallback: first large <img>
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (imgMatch?.[1]) {
    const url = imgMatch[1];
    return url.startsWith("http") ? url : new URL(url, baseUrl).href;
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

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json();
    const url: string = body?.url?.trim();
    if (!url || !url.startsWith("http"))
      return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });

    // 1. Fetch page HTML
    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FamilyDinnerPlanner/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return NextResponse.json({ error: "Seite nicht erreichbar" }, { status: 400 });
      html = await res.text();
    } catch {
      return NextResponse.json({ error: "Seite konnte nicht geladen werden" }, { status: 400 });
    }

    // 2. Extract + upload og:image
    const supabase = await createClient();
    const ogImageUrl = await extractOgImage(html, url);
    const imageUrl = ogImageUrl
      ? await downloadAndUpload(ogImageUrl, family.id, supabase)
      : null;

    // 3. Truncate HTML to avoid token limits (~120k chars)
    const truncated = html.length > 120_000 ? html.slice(0, 120_000) : html;

    // 4. Claude parse
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${IMPORT_PROMPT}\n\nURL: ${url}\n\nHTML:\n${truncated}`,
        },
      ],
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
