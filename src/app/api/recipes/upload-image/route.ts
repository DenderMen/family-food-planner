import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamily } from "@/lib/db/get-family";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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

    const supabase = await createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${family.id}/${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Storage upload:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("POST /api/recipes/upload-image:", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
