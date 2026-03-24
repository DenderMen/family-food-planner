import { NextRequest, NextResponse } from "next/server";
import { createOAuth2Client, saveTokens } from "@/lib/google-calendar";
import { getCurrentFamily } from "@/lib/db/get-family";

export async function GET(request: NextRequest) {
  try {
    const code  = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        new URL("/settings?google=error", request.nextUrl.origin)
      );
    }

    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.redirect(
        new URL("/login", request.nextUrl.origin)
      );
    }

    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      // Edge-case: Google only returns refresh_token on first consent.
      // The user must disconnect and reconnect to get a new one.
      return NextResponse.redirect(
        new URL("/settings?google=no_refresh_token", request.nextUrl.origin)
      );
    }

    await saveTokens(family.id, {
      accessToken:  tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresAt:    tokens.expiry_date ?? Date.now() + 3600_000,
    });

    return NextResponse.redirect(
      new URL("/settings?google=connected", request.nextUrl.origin)
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?google=error", request.nextUrl.origin)
    );
  }
}
