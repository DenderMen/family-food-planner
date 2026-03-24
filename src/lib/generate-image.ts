/**
 * Generate a food photo via Puter.js (free, no API key),
 * upload to Supabase Storage, and return the public URL.
 * Returns null if Puter.js is unavailable or generation fails.
 */
export async function generateImage(recipeName: string): Promise<string | null> {
  if (typeof window === "undefined" || !window.puter?.ai?.txt2img) return null;

  const prompt =
    `Professional food photography of ${recipeName}, close-up shot, ` +
    `shallow depth of field, warm natural lighting, on rustic wooden table, ` +
    `appetizing, high resolution, 4k, photorealistic`;

  try {
    const img = await window.puter.ai.txt2img(
      prompt,
      false,
      "black-forest-labs/FLUX.1-schnell-Free"
    );

    // Convert the image element src to a File for upload
    const response = await fetch(img.src);
    const blob = await response.blob();
    const file = new File([blob], "generated.png", { type: "image/png" });

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/recipes/upload-image", { method: "POST", body: fd });
    if (!res.ok) return null;

    const data = await res.json();
    return (data.url as string) ?? null;
  } catch {
    return null;
  }
}
