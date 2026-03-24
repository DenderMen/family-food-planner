import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

export const maxDuration = 60;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

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

    // ── 1. Gemini image generation ────────────────────────────────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Professional food photography of ${recipeName}, close-up shot, shallow depth of field, warm natural lighting, on a ceramic plate, appetizing, photorealistic`,
            }],
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API Error:", geminiRes.status, errorText);
      return NextResponse.json(
        { error: "Image generation failed", details: errorText },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const parts: GeminiPart[] = geminiData?.candidates?.[0]?.content?.parts ?? [];

    const imagePart = parts.find(
      (p) => p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) {
      console.error("Gemini response had no image part:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "Kein Bild in Gemini-Antwort" }, { status: 502 });
    }

    const { mimeType, data: base64 } = imagePart.inlineData;
    const ext = mimeType.split("/")[1] ?? "png";
    const imageBuffer = Buffer.from(base64, "base64");

    // ── 2. Upload to Supabase Storage ─────────────────────────────────────────
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

    // ── 3. Update recipe in DB ────────────────────────────────────────────────
    await db
      .update(recipes)
      .set({ imageUrl })
      .where(and(eq(recipes.id, recipeId), eq(recipes.familyId, family.id)));

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("POST /api/generate-image:", error);
    return NextResponse.json({ error: "Bildgenerierung fehlgeschlagen" }, { status: 500 });
  }
}
