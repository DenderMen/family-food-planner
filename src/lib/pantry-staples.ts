/**
 * Küchen-Basics — Zutaten die fast jeder dauerhaft zu Hause hat.
 * Wird zur Auto-Erkennung beim Rezept-Import und -Scan verwendet.
 */
const PANTRY_STAPLES = new Set([
  // Salz & Pfeffer
  "salz", "meersalz", "jodsalz", "tafelsalz",
  "pfeffer", "schwarzer pfeffer", "weißer pfeffer", "pfefferkörner", "pfeffer schwarz", "pfeffer weiß",

  // Öle & Fette
  "öl", "olivenöl", "sonnenblumenöl", "rapsöl", "pflanzenöl", "kokosöl", "sesamöl",

  // Essig
  "essig", "weißweinessig", "rotweinessig", "balsamico", "apfelessig", "balsamico essig",

  // Zucker & Süßungsmittel
  "zucker", "puderzucker", "brauner zucker", "rohzucker", "vanillezucker", "honig",

  // Mehl & Backen
  "mehl", "weizenmehl", "backpulver", "natron", "speisestärke", "hefe",

  // Gewürze & Kräuter (getrocknet)
  "oregano", "thymian", "basilikum getrocknet", "petersilie getrocknet",
  "paprikapulver", "paprikapulver süß", "paprikapulver scharf", "curry",
  "kurkuma", "kreuzkümmel", "zimt", "muskat", "muskatnuss", "lorbeer", "lorbeerblatt", "lorbeerblätter",
  "cayennepfeffer", "chilipulver", "knoblauchpulver", "zwiebelpulver",

  // Saucen & Pasten
  "tomatenmark", "senf", "mittelscharfer senf", "dijonsenf",
  "sojasauce", "worcestershiresauce", "tabasco",

  // Sonstiges
  "wasser", "vanilleextrakt", "vanille",
]);

/**
 * Gibt true zurück wenn der Zutatname ein typisches Küchen-Basic ist.
 * Vergleich case-insensitive, trimmed.
 */
export function isPantryStaple(name: string): boolean {
  return PANTRY_STAPLES.has(name.toLowerCase().trim());
}
