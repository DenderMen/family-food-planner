import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamily } from "@/lib/db/get-family";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

const client = new Anthropic();

const SCAN_PROMPT = `Du siehst ein Foto eines Rezepts (z.B. aus einem Kochbuch, Magazin oder handgeschrieben).
Extrahiere alle Informationen und antworte NUR mit einem validen JSON-Objekt (kein Markdown, kein Text davor oder danach):

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
- category: "fleisch" wenn Fleisch/Geflügel, "fisch" wenn Fisch/Meeresfrüchte, "vegetarisch" wenn kein Fleisch/Fisch, "abendbrot" wenn Brot/Aufschnitt, "snack" wenn Snack/Dessert
- prepTime + cookTime: Schätze wenn nicht angegeben (Gesamtzeit max 30 Min für Familienküche)
- estimatedCost: Schätze Gesamtkosten für 4 Personen in EUR
- preferredShop: Fleisch → metzger, günstige Basics → aldi, sonst → supermarkt
- Falls du etwas nicht erkennen kannst, verwende sinnvolle Standardwerte
- Antworte AUSSCHLIESSLICH mit dem JSON, ohne weitere Erklärungen`;

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Keine Datei übergeben" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Nur JPG, PNG oder WebP erlaubt" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Bild zu groß – max. 5 MB" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Upload to Supabase Storage
    const supabase = await createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${family.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    let imageUrl: string | null = null;
    if (!uploadError) {
      const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    } else {
      console.warn("Storage upload failed (scan):", uploadError.message);
    }

    // 2. Claude Vision
    const base64 = buffer.toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: SCAN_PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    let recipe: Record<string, unknown>;
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      recipe = JSON.parse(cleaned);
    } catch {
      console.error("Claude Vision JSON parse error:", raw);
      return NextResponse.json({ error: "Rezept konnte nicht erkannt werden" }, { status: 422 });
    }

    return NextResponse.json({ ...recipe, imageUrl });
  } catch (error) {
    console.error("POST /api/recipes/scan:", error);
    return NextResponse.json({ error: "Scan fehlgeschlagen" }, { status: 500 });
  }
}
