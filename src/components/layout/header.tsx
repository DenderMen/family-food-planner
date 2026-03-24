import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export function AppHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#2D2A26",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <Link
            href="/plan"
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <span style={{ fontSize: "24px", lineHeight: 1 }}>🍽️</span>
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
              }}
            >
              Family Dinner Planner
            </span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
