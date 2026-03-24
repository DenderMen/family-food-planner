import {
  pgTable, uuid, text, numeric, boolean, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { families } from "./families";

export const familyMembers = pgTable("family_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthDate: text("birth_date"),
  emoji: text("emoji").default("👤"),
  role: text("role").notNull(),
  ageGroup: text("age_group").notNull(),
  portionFactor: numeric("portion_factor").default("1.0"),
  isNursing: boolean("is_nursing").default(false),
  isMainCook: boolean("is_main_cook").default(false),
  likes: text("likes").array().default([]),
  allergies: text("allergies").array().default([]),
  dislikes: text("dislikes").array().default([]),
  dietaryNeeds: jsonb("dietary_needs").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
