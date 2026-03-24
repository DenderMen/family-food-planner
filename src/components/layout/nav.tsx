"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { NAV_ITEMS } from "@/types";
import { CalendarDays, BookOpen, ShoppingCart, Baby, Settings } from "lucide-react";

const LUCIDE: Record<string, React.ReactNode> = {
  "/plan":     <CalendarDays size={22} strokeWidth={1.8} />,
  "/rezepte":  <BookOpen     size={22} strokeWidth={1.8} />,
  "/shopping": <ShoppingCart size={22} strokeWidth={1.8} />,
  "/kids":     <Baby         size={22} strokeWidth={1.8} />,
  "/settings": <Settings     size={22} strokeWidth={1.8} />,
};

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E8E2DA",
        boxShadow: "0 -4px 20px rgba(45,42,38,0.08)",
        /* Safe area for notched phones */
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <ul
          style={{
            display: "flex",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} style={{ flex: 1 }}>
                <Link
                  href={item.href as Route}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "3px",
                    padding: "8px 4px 12px",
                    textDecoration: "none",
                    color: isActive ? "#C85D3B" : "#8A8580",
                    transition: "color 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                      lineHeight: 1,
                      width: 44,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      background: isActive ? "rgba(200,93,59,0.10)" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    {LUCIDE[item.href]}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: "0.01em",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
