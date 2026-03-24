import {
  pgTable, uuid, text, numeric, boolean, integer,
} from "drizzle-orm/pg-core";
import { shoppingLists } from "./shopping-lists";

export const shoppingItems = pgTable("shopping_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id").references(() => shoppingLists.id, { onDelete: "cascade" }),
  ingredientName: text("ingredient_name").notNull(),
  amount: numeric("amount").notNull(),
  unit: text("unit").notNull(),
  shop: text("shop").notNull(), // 'REWE' | 'Edeka' | 'Aldi' | 'Metzger' | 'Vorrat'
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }).default("0"),
  actualPrice: numeric("actual_price", { precision: 10, scale: 2 }),
  forRecipes: text("for_recipes").array().default([]),
  checked: boolean("checked").default(false),
  sortOrder: integer("sort_order").default(0),
});

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type NewShoppingItem = typeof shoppingItems.$inferInsert;
