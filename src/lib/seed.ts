import { db } from "@/lib/db";
import { recipes, ingredients, familyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Family member seed data ──────────────────────────────────────────────────

export async function seedFamilyMembers(familyId: string) {
  const MEMBERS = [
    {
      name: "Dennis",
      emoji: "👨",
      role: "parent",
      ageGroup: "adult",
      portionFactor: "1.0",
      isNursing: false,
      isMainCook: false,
      likes: ["Gesundes", "Ausgewogenes", "Fleisch", "Gemüse"],
      dislikes: [],
      allergies: [],
      dietaryNeeds: [],
    },
    {
      name: "Kaja",
      emoji: "👩",
      role: "parent",
      ageGroup: "adult",
      portionFactor: "1.2",
      isNursing: true,
      isMainCook: true,
      likes: ["Kalziumreiche Lebensmittel", "Fisch", "Hülsenfrüchte"],
      dislikes: [],
      allergies: [],
      dietaryNeeds: [
        "Stillzeit: +500 kcal/Tag",
        "Extra Kalzium (Milch, Käse, Brokkoli)",
        "Extra Eisen (Fleisch, Hülsenfrüchte)",
        "Extra Omega-3 (Fisch, Leinöl)",
      ],
    },
    {
      name: "Theo",
      emoji: "👦",
      role: "child",
      ageGroup: "child",
      portionFactor: "0.6",
      isNursing: false,
      isMainCook: false,
      likes: ["Pasta", "Kartoffeln", "Pizza", "Fischstäbchen", "Pommes"],
      dislikes: ["Pilze", "Aubergine"],
      allergies: [],
      dietaryNeeds: [],
    },
    {
      name: "Carlo",
      emoji: "🧒",
      role: "child",
      ageGroup: "child",
      portionFactor: "0.5",
      isNursing: false,
      isMainCook: false,
      likes: ["Isst vom Familientisch", "Kartoffeln", "Brot"],
      dislikes: [],
      allergies: [],
      dietaryNeeds: [],
    },
    {
      name: "Paulo",
      emoji: "👶",
      role: "baby",
      ageGroup: "baby",
      portionFactor: "0.0",
      isNursing: false,
      isMainCook: false,
      likes: [],
      dislikes: [],
      allergies: [],
      dietaryNeeds: ["Vollgestillt – kein eigenes Essen"],
    },
  ];

  for (const m of MEMBERS) {
    await db.insert(familyMembers).values({
      familyId,
      name: m.name,
      emoji: m.emoji,
      role: m.role,
      ageGroup: m.ageGroup,
      portionFactor: m.portionFactor,
      isNursing: m.isNursing,
      isMainCook: m.isMainCook,
      likes: m.likes,
      dislikes: m.dislikes,
      allergies: m.allergies,
      dietaryNeeds: m.dietaryNeeds,
    });
  }
}

const SEED_RECIPES = [
  {
    name: "Bolognese mit Spaghetti",
    type: "warm",
    category: "fleisch",
    prepTime: 10,
    cookTime: 20,
    estimatedCost: "12.00",
    isFavorite: true,
    nursingBoost: "Rind liefert Eisen und Zink – ideal für die Stillzeit.",
    steps: [
      "Zwiebel, Möhre und Knoblauch fein würfeln.",
      "Olivenöl in der Pfanne erhitzen, Gemüse 3 Min. andünsten.",
      "Hackfleisch dazugeben und krümelig braten.",
      "Tomatenmark einrühren, 1 Min. rösten.",
      "Dosentomaten, Salz, Pfeffer, Oregano dazugeben.",
      "20 Min. bei mittlerer Hitze köcheln lassen.",
      "Spaghetti nach Packungsanleitung kochen und servieren.",
    ],
    ingredients: [
      { name: "Rinderhackfleisch", amount: "500", unit: "g", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "5.50", bio: false },
      { name: "Spaghetti", amount: "400", unit: "g", category: "nudeln", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: false },
      { name: "Dosentomaten", amount: "2", unit: "Dose", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "1.50", bio: false },
      { name: "Zwiebel", amount: "1", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.30", bio: true },
      { name: "Möhre", amount: "1", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: true },
      { name: "Knoblauch", amount: "2", unit: "Zehen", category: "gewürze", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: false },
      { name: "Tomatenmark", amount: "2", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.30", bio: false },
      { name: "Parmesan", amount: "50", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: false },
    ],
  },
  {
    name: "Käsespätzle mit Röstzwiebeln",
    type: "warm",
    category: "vegetarisch",
    prepTime: 15,
    cookTime: 20,
    estimatedCost: "8.00",
    isFavorite: true,
    nursingBoost: "Käse liefert Kalzium – wichtig beim Stillen.",
    steps: [
      "Mehl, Eier, Salz und Wasser zu einem zähflüssigen Teig verrühren.",
      "Großen Topf mit Salzwasser zum Kochen bringen.",
      "Spätzle durch die Spätzlepresse direkt ins kochende Wasser drücken.",
      "Wenn die Spätzle oben schwimmen (ca. 2 Min.), herausheben.",
      "Lagen-weise Spätzle und Käse in eine Auflaufform schichten.",
      "10 Min. bei 200°C im Ofen überbacken.",
      "Zwiebeln in Butter goldbraun braten und obendrüber geben.",
    ],
    ingredients: [
      { name: "Mehl (Type 405)", amount: "400", unit: "g", category: "backwaren", preferredShop: "Aldi", estimatedPrice: "0.80", bio: false },
      { name: "Eier", amount: "4", unit: "Stück", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "1.60", bio: true },
      { name: "Emmentaler gerieben", amount: "200", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "2.50", bio: false },
      { name: "Zwiebeln", amount: "3", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.60", bio: false },
      { name: "Butter", amount: "50", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.50", bio: true },
    ],
  },
  {
    name: "Kartoffelgratin",
    type: "warm",
    category: "vegetarisch",
    prepTime: 20,
    cookTime: 45,
    estimatedCost: "10.00",
    isFavorite: true,
    nursingBoost: "Sahne und Käse liefern Kalzium und Kalorien für die Stillzeit.",
    steps: [
      "Kartoffeln schälen und in dünne Scheiben (ca. 3mm) hobeln.",
      "Knoblauch halbieren und die Auflaufform damit ausreiben.",
      "Auflaufform mit Butter einfetten.",
      "Kartoffelscheiben dachziegelartig in die Form schichten, salzen und pfeffern.",
      "Sahne und Milch mischen, über die Kartoffeln gießen.",
      "Mit geriebenem Käse bestreuen.",
      "45–50 Min. bei 190°C backen, bis die Oberfläche goldbraun ist.",
    ],
    ingredients: [
      { name: "Kartoffeln (festkochend)", amount: "1000", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "2.00", bio: true },
      { name: "Schlagsahne", amount: "200", unit: "ml", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.90", bio: false },
      { name: "Milch", amount: "100", unit: "ml", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: true },
      { name: "Gruyère gerieben", amount: "150", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "2.50", bio: false },
      { name: "Knoblauch", amount: "2", unit: "Zehen", category: "gewürze", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: false },
      { name: "Butter", amount: "20", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: true },
      { name: "Muskatnuss", amount: "1", unit: "Prise", category: "gewürze", preferredShop: "Aldi", estimatedPrice: "0.10", bio: false },
    ],
  },
  {
    name: "Kartoffeln + Spinat + Fischstäbchen",
    type: "warm",
    category: "fisch",
    prepTime: 10,
    cookTime: 25,
    estimatedCost: "9.00",
    isFavorite: true,
    nursingBoost: "Spinat liefert Eisen und Folsäure, Fisch Omega-3 – ideal für Stillzeit.",
    steps: [
      "Kartoffeln schälen, würfeln und in Salzwasser 20 Min. kochen.",
      "Fischstäbchen nach Packung im Ofen (200°C, 15 Min.) backen.",
      "Spinat in einer Pfanne mit Butter und Knoblauch andünsten bis er zusammenfällt.",
      "Mit Salz, Pfeffer und Muskat würzen.",
      "Kartoffeln abgießen, mit Butter und etwas Milch stampfen.",
      "Alles zusammen servieren.",
    ],
    ingredients: [
      { name: "Kartoffeln (mehligkochend)", amount: "700", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "1.50", bio: true },
      { name: "Blattspinat (TK)", amount: "450", unit: "g", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "1.50", bio: false },
      { name: "Fischstäbchen (TK)", amount: "10", unit: "Stück", category: "fisch", preferredShop: "Aldi", estimatedPrice: "2.50", bio: false },
      { name: "Butter", amount: "40", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.40", bio: true },
      { name: "Milch", amount: "50", unit: "ml", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.10", bio: true },
      { name: "Knoblauch", amount: "1", unit: "Zehe", category: "gewürze", preferredShop: "Supermarkt", estimatedPrice: "0.10", bio: false },
    ],
  },
  {
    name: "Hot Dogs + Pommes",
    type: "warm",
    category: "fleisch",
    prepTime: 5,
    cookTime: 20,
    estimatedCost: "7.00",
    isFavorite: true,
    steps: [
      "Pommes frites nach Packungsanleitung im Ofen (220°C, 20 Min.) knusprig backen.",
      "Würstchen in heißem (nicht kochendem) Wasser 5–8 Min. erwärmen.",
      "Brötchen kurz aufbacken oder toasten.",
      "Hot Dogs zusammenstellen, mit Ketchup und Senf servieren.",
    ],
    ingredients: [
      { name: "Wiener Würstchen", amount: "6", unit: "Stück", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "2.50", bio: false },
      { name: "Pommes frites (TK)", amount: "600", unit: "g", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "1.50", bio: false },
      { name: "Hotdog-Brötchen", amount: "4", unit: "Stück", category: "backwaren", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: false },
      { name: "Ketchup", amount: "1", unit: "Portion", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.50", bio: false },
    ],
  },
  {
    name: "Pizza",
    type: "warm",
    category: "vegetarisch",
    prepTime: 20,
    cookTime: 15,
    estimatedCost: "8.00",
    isFavorite: true,
    nursingBoost: "Mozzarella liefert Kalzium und Protein.",
    steps: [
      "Teig: Hefe in lauwarmes Wasser geben, 5 Min. stehen lassen.",
      "Mehl, Salz und Olivenöl zugeben, 8 Min. kneten.",
      "Teig 30 Min. gehen lassen (oder sofort verwenden).",
      "Tomatensoße: Dosentomaten mit Salz, Oregano, Knoblauch pürieren.",
      "Teig dünn ausrollen, auf Backblech legen.",
      "Mit Soße bestreichen, Mozzarella und Belag drauf.",
      "15–18 Min. bei 230°C auf unterster Schiene backen.",
    ],
    ingredients: [
      { name: "Mehl (Type 550)", amount: "500", unit: "g", category: "backwaren", preferredShop: "Aldi", estimatedPrice: "0.90", bio: false },
      { name: "Trockenhefe", amount: "7", unit: "g", category: "backwaren", preferredShop: "Aldi", estimatedPrice: "0.30", bio: false },
      { name: "Dosentomaten (gestückelt)", amount: "1", unit: "Dose", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "0.80", bio: false },
      { name: "Mozzarella", amount: "250", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "2.00", bio: false },
      { name: "Olivenöl", amount: "3", unit: "EL", category: "sonstiges", preferredShop: "Supermarkt", estimatedPrice: "0.50", bio: false },
      { name: "Oregano", amount: "1", unit: "TL", category: "gewürze", preferredShop: "Aldi", estimatedPrice: "0.10", bio: false },
    ],
  },
];

// ─── Snack seed data ──────────────────────────────────────────────────────────

const SNACK_RECIPES = [
  {
    name: "Sahne-Heringe",
    description: "Klassischer Heringsalat mit Sahnedressing",
    estimatedCost: "3.50",
    prepTime: 5,
    ingredients: [
      { name: "Bismarck-Heringe (Glas)", amount: "1", unit: "Glas", category: "fisch", preferredShop: "Supermarkt", estimatedPrice: "2.20", bio: false },
      { name: "Schmand", amount: "100", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.60", bio: false },
      { name: "Zwiebel", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.15", bio: false },
    ],
  },
  {
    name: "Obatzda",
    description: "Bayerischer Käseaufstrich mit Kümmel",
    estimatedCost: "2.80",
    prepTime: 5,
    ingredients: [
      { name: "Camembert", amount: "200", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.50", bio: false },
      { name: "Frischkäse", amount: "100", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.70", bio: false },
      { name: "Butter", amount: "30", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.30", bio: true },
      { name: "Kümmel gemahlen", amount: "1", unit: "TL", category: "gewürze", preferredShop: "Aldi", estimatedPrice: "0.10", bio: false },
    ],
  },
  {
    name: "Wiener Würstchen warm",
    description: "Klassische Würstchen im heißen Wasser, mit Senf",
    estimatedCost: "3.20",
    prepTime: 8,
    ingredients: [
      { name: "Wiener Würstchen", amount: "6", unit: "Stück", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "2.50", bio: false },
      { name: "Senf mittelscharf", amount: "2", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.20", bio: false },
    ],
  },
  {
    name: "Gurkensalat mit Dill",
    description: "Frischer Gurkensalat mit saurer Sahne und Dill",
    estimatedCost: "2.20",
    prepTime: 8,
    ingredients: [
      { name: "Salatgurke", amount: "1", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.79", bio: true },
      { name: "Saure Sahne", amount: "150", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.69", bio: false },
      { name: "Dill frisch", amount: "0.5", unit: "Bund", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.49", bio: false },
    ],
  },
  {
    name: "Mini-Frikadellen",
    description: "Kleine Hackfleisch-Bällchen, kalt oder warm",
    estimatedCost: "4.50",
    prepTime: 10,
    ingredients: [
      { name: "Gemischtes Hackfleisch", amount: "300", unit: "g", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "2.80", bio: false },
      { name: "Zwiebel", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.15", bio: false },
      { name: "Ei", amount: "1", unit: "Stück", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.30", bio: true },
      { name: "Paniermehl", amount: "3", unit: "EL", category: "backwaren", preferredShop: "Aldi", estimatedPrice: "0.20", bio: false },
    ],
  },
  {
    name: "Kartoffelsalat",
    description: "Schwäbischer Kartoffelsalat mit Brühe und Essig",
    estimatedCost: "3.00",
    prepTime: 10,
    ingredients: [
      { name: "Kartoffeln (festkochend)", amount: "500", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "1.00", bio: true },
      { name: "Gemüsebrühe", amount: "100", unit: "ml", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.30", bio: false },
      { name: "Weißweinessig", amount: "3", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.20", bio: false },
      { name: "Senf", amount: "1", unit: "TL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.10", bio: false },
    ],
  },
  {
    name: "Eiersalat",
    description: "Cremiger Eiersalat mit Schnittlauch",
    estimatedCost: "2.50",
    prepTime: 8,
    ingredients: [
      { name: "Eier", amount: "4", unit: "Stück", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: true },
      { name: "Mayonnaise", amount: "4", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.50", bio: false },
      { name: "Schnittlauch", amount: "0.5", unit: "Bund", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.49", bio: false },
    ],
  },
  {
    name: "Käseplatte bunt",
    description: "Auswahl aus 3 Käsesorten mit Trauben",
    estimatedCost: "4.80",
    prepTime: 5,
    ingredients: [
      { name: "Gouda jung", amount: "100", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: false },
      { name: "Emmentaler", amount: "100", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.30", bio: false },
      { name: "Camembert", amount: "100", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: false },
      { name: "Weintrauben", amount: "150", unit: "g", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.90", bio: false },
    ],
  },
  {
    name: "Matjes-Happen",
    description: "Matjesfilets mit Zwiebeln und Apfel",
    estimatedCost: "3.80",
    prepTime: 5,
    ingredients: [
      { name: "Matjesfilets", amount: "200", unit: "g", category: "fisch", preferredShop: "Supermarkt", estimatedPrice: "2.80", bio: false },
      { name: "Rote Zwiebel", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.20", bio: false },
      { name: "Apfel", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.30", bio: true },
    ],
  },
  {
    name: "Tütensuppe als Vorspeise",
    description: "Schnelle Tomaten- oder Hühnersuppe aus der Tüte",
    estimatedCost: "1.50",
    prepTime: 5,
    ingredients: [
      { name: "Tütensuppe (Tomate oder Huhn)", amount: "1", unit: "Packung", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.89", bio: false },
      { name: "Wasser", amount: "750", unit: "ml", category: "sonstiges", preferredShop: "Vorrat", estimatedPrice: "0.00", bio: false },
    ],
  },
  {
    name: "Gefüllte Eier (Devilled Eggs)",
    description: "Hartgekochte Eier mit Frischkäse-Füllung",
    estimatedCost: "2.20",
    prepTime: 10,
    ingredients: [
      { name: "Eier", amount: "4", unit: "Stück", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "1.20", bio: true },
      { name: "Frischkäse", amount: "60", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.50", bio: false },
      { name: "Schnittlauch", amount: "0.5", unit: "Bund", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.39", bio: false },
    ],
  },
  {
    name: "Wurst-Käse-Spieße",
    description: "Bunte Spieße mit Salami, Käse und Paprika – Kinder lieben sie",
    estimatedCost: "3.20",
    prepTime: 8,
    ingredients: [
      { name: "Salami (Scheiben)", amount: "100", unit: "g", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "1.50", bio: false },
      { name: "Gouda (Würfel)", amount: "100", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.00", bio: false },
      { name: "Paprika rot", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.40", bio: true },
    ],
  },
  {
    name: "Tzatziki mit Gemüse",
    description: "Frisches Joghurtdip mit Dippgemüse",
    estimatedCost: "2.80",
    prepTime: 8,
    ingredients: [
      { name: "Griechischer Joghurt", amount: "200", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.99", bio: false },
      { name: "Salatgurke", amount: "0.5", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.40", bio: true },
      { name: "Möhren", amount: "2", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.30", bio: true },
      { name: "Knoblauch", amount: "1", unit: "Zehe", category: "gewürze", preferredShop: "Supermarkt", estimatedPrice: "0.10", bio: false },
    ],
  },
  {
    name: "Fleischsalat hausgemacht",
    description: "Klassischer Fleischsalat mit Essiggurken und Mayonnaise",
    estimatedCost: "4.00",
    prepTime: 10,
    ingredients: [
      { name: "Lyoner (Scheiben)", amount: "150", unit: "g", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "1.80", bio: false },
      { name: "Essiggurken", amount: "3", unit: "Stück", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "0.40", bio: false },
      { name: "Mayonnaise", amount: "3", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.40", bio: false },
    ],
  },
  {
    name: "Hummus mit Fladenbrot",
    description: "Cremiger Kichererbsen-Dip, Kinder mögen ihn",
    estimatedCost: "2.50",
    prepTime: 5,
    ingredients: [
      { name: "Hummus (Fertig)", amount: "200", unit: "g", category: "sonstiges", preferredShop: "Supermarkt", estimatedPrice: "1.49", bio: false },
      { name: "Fladenbrot mini", amount: "2", unit: "Stück", category: "backwaren", preferredShop: "Supermarkt", estimatedPrice: "0.89", bio: false },
    ],
  },
  {
    name: "Hering in Senfsoße",
    description: "Heringshappen in würziger Senfmarinade",
    estimatedCost: "3.20",
    prepTime: 5,
    ingredients: [
      { name: "Heringsfilets in Senfsoße (Dose)", amount: "1", unit: "Dose", category: "fisch", preferredShop: "Supermarkt", estimatedPrice: "2.20", bio: false },
      { name: "Frühlingszwiebeln", amount: "2", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.39", bio: false },
    ],
  },
  {
    name: "Leberwurst-Schnittchen",
    description: "Brotscheiben mit grober Leberwurst und Gürkchen",
    estimatedCost: "2.00",
    prepTime: 3,
    ingredients: [
      { name: "Grobe Leberwurst", amount: "150", unit: "g", category: "fleisch", preferredShop: "Metzger", estimatedPrice: "1.20", bio: false },
      { name: "Cornichons", amount: "6", unit: "Stück", category: "gemüse", preferredShop: "Aldi", estimatedPrice: "0.40", bio: false },
    ],
  },
  {
    name: "Radieschen-Butter-Brot",
    description: "Frische Radieschen auf Butter, Meersalz drüber",
    estimatedCost: "1.80",
    prepTime: 5,
    ingredients: [
      { name: "Radieschen", amount: "1", unit: "Bund", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.79", bio: true },
      { name: "Butter", amount: "40", unit: "g", category: "milchprodukte", preferredShop: "Supermarkt", estimatedPrice: "0.40", bio: true },
      { name: "Meersalz", amount: "1", unit: "Prise", category: "gewürze", preferredShop: "Aldi", estimatedPrice: "0.05", bio: false },
    ],
  },
  {
    name: "Tomaten-Mozzarella",
    description: "Klassisch mit Basilikum und gutem Olivenöl",
    estimatedCost: "3.80",
    prepTime: 5,
    ingredients: [
      { name: "Mozzarella", amount: "125", unit: "g", category: "käse", preferredShop: "Supermarkt", estimatedPrice: "1.29", bio: false },
      { name: "Tomaten", amount: "3", unit: "Stück", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "1.00", bio: true },
      { name: "Basilikum frisch", amount: "0.5", unit: "Bund", category: "gemüse", preferredShop: "Supermarkt", estimatedPrice: "0.79", bio: false },
      { name: "Olivenöl", amount: "2", unit: "EL", category: "sonstiges", preferredShop: "Supermarkt", estimatedPrice: "0.50", bio: false },
    ],
  },
  {
    name: "Warme Suppenwürstchen",
    description: "Cocktailwürstchen aus dem Glas, erwärmt – Kinder-Favorit",
    estimatedCost: "2.80",
    prepTime: 5,
    ingredients: [
      { name: "Cocktailwürstchen (Glas)", amount: "1", unit: "Glas", category: "fleisch", preferredShop: "Supermarkt", estimatedPrice: "2.20", bio: false },
      { name: "Senf", amount: "1", unit: "EL", category: "sonstiges", preferredShop: "Aldi", estimatedPrice: "0.10", bio: false },
    ],
  },
];

export async function seedSnacks(familyId: string) {
  for (const snack of SNACK_RECIPES) {
    const { ingredients: ings, description, ...sData } = snack;

    const [newRecipe] = await db
      .insert(recipes)
      .values({
        familyId,
        name: sData.name,
        slug: sData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        type: "abendbrot",
        category: "snack",
        prepTime: sData.prepTime,
        cookTime: 0,
        totalTime: sData.prepTime,
        estimatedCost: sData.estimatedCost,
        isFavorite: false,
        nursingBoost: null,
        steps: [`${description}`],
        childAdaptions: {},
        imageUrl: null,
      })
      .returning();

    if (ings.length > 0) {
      await db.insert(ingredients).values(
        ings.map((ing, i) => ({
          recipeId: newRecipe.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          category: ing.category,
          preferredShop: ing.preferredShop,
          estimatedPrice: ing.estimatedPrice,
          bio: ing.bio,
          sortOrder: i,
        }))
      );
    }
  }
}

export async function seedRecipes(familyId: string) {
  for (const recipeData of SEED_RECIPES) {
    const { ingredients: ings, ...rData } = recipeData;

    const [newRecipe] = await db
      .insert(recipes)
      .values({
        familyId,
        name: rData.name,
        slug: rData.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
        type: rData.type,
        category: rData.category,
        prepTime: rData.prepTime,
        cookTime: rData.cookTime,
        totalTime: rData.prepTime + rData.cookTime,
        estimatedCost: rData.estimatedCost,
        isFavorite: rData.isFavorite,
        nursingBoost: rData.nursingBoost ?? null,
        steps: rData.steps,
        imageUrl: null,
      })
      .returning();

    if (ings.length > 0) {
      await db.insert(ingredients).values(
        ings.map((ing, i) => ({
          recipeId: newRecipe.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          category: ing.category,
          preferredShop: ing.preferredShop,
          estimatedPrice: ing.estimatedPrice,
          bio: ing.bio,
          sortOrder: i,
        }))
      );
    }
  }
}

// Run directly: npx tsx src/lib/seed.ts
if (require.main === module) {
  (async () => {
    const familyId = process.argv[2];
    if (!familyId) {
      console.error("Usage: npx tsx src/lib/seed.ts <familyId>");
      process.exit(1);
    }
    const existing = await db
      .select()
      .from(recipes)
      .where(eq(recipes.familyId, familyId));
    if (existing.length > 0) {
      console.log(`Already ${existing.length} recipes for this family. Skipping.`);
      process.exit(0);
    }
    await seedRecipes(familyId);
    console.log("Seed complete: 6 Favoriten-Rezepte erstellt.");
    process.exit(0);
  })();
}
