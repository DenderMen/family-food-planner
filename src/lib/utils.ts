import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function getWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function getWeekDates(weekId: string): Date[] {
  const [yearStr, wStr] = weekId.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { month: "2-digit", day: "2-digit" });
}

export const DAYS_DE = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch",
  "Donnerstag", "Freitag", "Samstag",
];

export const SHOPS_ORDER = ["Aldi", "Supermarkt", "Metzger", "Vorrat"] as const;


export function pollinationsImageUrl(name: string): string {
  const n = name.toLowerCase();
  let subject: string;
  if (n.includes("bolognese"))                              subject = "spaghetti bolognese with rich meat sauce";
  else if (n.includes("spätzle"))                           subject = "german cheese spaetzle käsespätzle with caramelized onions";
  else if (n.includes("kartoffelgratin"))                   subject = "potato gratin au gratin with cream and cheese crust";
  else if (n.includes("fischstäbchen"))                     subject = "fish sticks with mashed potato and spinach";
  else if (n.includes("hot dog"))                           subject = "hot dogs with french fries";
  else if (n.includes("pizza"))                             subject = "homemade pizza with fresh colorful toppings";
  else if (n.includes("pasta") || n.includes("nudel"))      subject = "pasta dish with savory sauce";
  else if (n.includes("schnitzel"))                         subject = "golden wiener schnitzel with lemon slice";
  else if (n.includes("hähnchen") || n.includes("huhn"))   subject = "roasted chicken with herbs and vegetables";
  else if (n.includes("kartoffelsalat"))                    subject = "german potato salad with herbs";
  else if (n.includes("kartoffel"))                         subject = "potato dish with herbs";
  else if (n.includes("suppe"))                             subject = "warm homemade soup with vegetables";
  else if (n.includes("salat"))                             subject = "fresh colorful salad";
  else if (n.includes("abendbrot") || n.includes("brotzeit")) subject = "german bread with cold cuts and cheese on wooden board";
  else if (n.includes("brot") || n.includes("schnittchen")) subject = "artisan bread with toppings";
  else if (n.includes("hering") || n.includes("matjes"))   subject = "pickled herring with onions and cream";
  else if (n.includes("obatzda"))                           subject = "bavarian obatzda cheese spread with radish and pretzel";
  else if (n.includes("frikadellen"))                       subject = "german meatballs on plate";
  else if (n.includes("mozzarella"))                        subject = "caprese salad tomato and mozzarella with basil";
  else if (n.includes("hummus"))                            subject = "creamy hummus dip with olive oil and paprika";
  else if (n.includes("tzatziki"))                          subject = "greek tzatziki dip with cucumber and herbs";
  else if (n.includes("würstchen"))                         subject = "german cocktail sausages with mustard";
  else if (n.includes("käseplatte"))                        subject = "cheese board with variety of cheeses and crackers";
  else if (n.includes("eiersalat"))                         subject = "egg salad with mayonnaise and chives";
  else if (n.includes("fleischsalat"))                      subject = "german meat salad with pickles";
  else if (n.includes("gurkensalat"))                       subject = "fresh cucumber salad with dill and vinegar";
  else if (n.includes("leberwurst"))                        subject = "bread with liverwurst spread and pickles";
  else if (n.includes("radieschen"))                        subject = "bread with butter and fresh radishes";
  else if (n.includes("gefüllte"))                          subject = "deviled eggs with paprika and herbs";
  else if (n.includes("spieße"))                            subject = "skewers with sausage and cheese";
  else if (n.includes("wurst"))                             subject = "german sausage platter";
  else if (n.includes("käse"))                              subject = "cheese platter with crackers";
  else                                                      subject = `${name} dish`;
  const prompt = encodeURIComponent(
    `delicious ${subject}, german home cooking, food photography, appetizing, warm lighting, close up`
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=600&height=400&nologo=true`;
}

export function getCurrentSeason(): string {
  const m = new Date().getMonth() + 1; // 1–12
  if (m >= 3 && m <= 5) return "Frühling";
  if (m >= 6 && m <= 8) return "Sommer";
  if (m >= 9 && m <= 11) return "Herbst";
  return "Winter";
}
