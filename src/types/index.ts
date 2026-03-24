export type MealType = "warm" | "abendbrot";
export type MealCategory = "fleisch" | "fisch" | "vegetarisch" | "abendbrot" | "snack";
export type Season = "frühling" | "sommer" | "herbst" | "winter";
export type ShopName = "Aldi" | "Supermarkt" | "Metzger" | "Vorrat";
export type PlanStatus = "draft" | "planned" | "active" | "completed";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  emoji: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Wochenplan", href: "/plan", icon: "calendar", emoji: "📅" },
  { label: "Rezepte", href: "/rezepte", icon: "book", emoji: "📖" },
  { label: "Einkauf", href: "/shopping", icon: "shopping-cart", emoji: "🛒" },
  { label: "Kinder", href: "/kids", icon: "star", emoji: "⭐" },
  { label: "Einstellungen", href: "/settings", icon: "user", emoji: "⚙️" },
];
