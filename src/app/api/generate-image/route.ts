import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

export const maxDuration = 60;

// Models to try in order — first one that responds 200 wins
const MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callGemini(model: string, prompt: string, apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );
  return res;
}

// ── GET /api/generate-image — debug: probe all models & return status ─────────
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const results: Record<string, unknown> = {};
  for (const model of MODELS) {
    const res = await callGemini(model, "test", apiKey);
    const body = await res.text();
    results[model] = { status: res.status, body: body.slice(0, 300) };
  }
  return NextResponse.json(results);
}

// ── POST /api/generate-image — generate + upload + update DB ─────────────────
export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { recipeName, recipeId } = await request.json() as { recipeName: string; recipeId: string };
    if (!recipeName || !recipeId) {
      return NextResponse.json({ error: "recipeName und recipeId erforderlich" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY nicht konfiguriert" }, { status: 500 });
    }

    const prompt =
      `Professional food photography of ${recipeName}, close-up shot, ` +
      `shallow depth of field, warm natural lighting, on a ceramic plate, appetizing, photorealistic`;

    // ── 1. Try models in order ────────────────────────────────────────────────
    let geminiRes: Response | null = null;
    let usedModel = "";
    const modelErrors: Record<string, string> = {};

    for (const model of MODELS) {
      const res = await callGemini(model, prompt, apiKey);
      if (res.ok) {
        geminiRes = res;
        usedModel = model;
        break;
      }
      const errText = await res.text();
      modelErrors[model] = `${res.status}: ${errText.slice(0, 200)}`;
      console.error(`Gemini model ${model} failed:`, res.status, errText.slice(0, 200));
    }

    if (!geminiRes) {
      return NextResponse.json(
        { error: "Alle Gemini-Modelle fehlgeschlagen", models: modelErrors },
        { status: 502 }
      );
    }

    // ── 2. Parse response ─────────────────────────────────────────────────────
    const geminiData = await geminiRes.json();
    const parts: GeminiPart[] = geminiData?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart?.inlineData) {
      console.error(`Model ${usedModel} returned no image part:`, JSON.stringify(geminiData).slice(0, 400));
      return NextResponse.json(
        { error: "Kein Bild in Gemini-Antwort", model: usedModel, parts: parts.map((p) => Object.keys(p)) },
        { status: 502 }
      );
    }

    const { mimeType, data: base64 } = imagePart.inlineData;
    const ext = mimeType.split("/")[1] ?? "png";
    const imageBuffer = Buffer.from(base64, "base64");

    // ── 3. Upload to Supabase Storage ─────────────────────────────────────────
    const supabase = await createClient();
    const path = `${family.id}/${recipeId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(path, imageBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Storage upload:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("recipe-images").getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    // ── 4. Update recipe in DB ────────────────────────────────────────────────
    await db
      .update(recipes)
      .set({ imageUrl })
      .where(and(eq(recipes.id, recipeId), eq(recipes.familyId, family.id)));

    return NextResponse.json({ url: imageUrl, model: usedModel });
  } catch (error) {
    console.error("POST /api/generate-image:", error);
    return NextResponse.json({ error: "Bildgenerierung fehlgeschlagen" }, { status: 500 });
  }
}
