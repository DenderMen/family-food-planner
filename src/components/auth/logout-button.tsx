"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        fontSize: "13px",
        color: "rgba(255,255,255,0.5)",
        background: "transparent",
        border: "none",
        padding: "6px 8px",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      Abmelden
    </button>
  );
}
