import {
  pgTable, uuid, text, jsonb, timestamp,
} from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id"),
  preferences: jsonb("preferences").notNull().default({}),
  shopping: jsonb("shopping").notNull().default({}),
  equipment: text("equipment").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
