import { relations } from "drizzle-orm";
import { families } from "./families";
import { recipes } from "./recipes";
import { ingredients } from "./ingredients";
import { weekPlans } from "./week-plans";
import { dayPlans } from "./day-plans";

export const familiesRelations = relations(families, ({ many }) => ({
  recipes: many(recipes),
  weekPlans: many(weekPlans),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  family: one(families, { fields: [recipes.familyId], references: [families.id] }),
  ingredients: many(ingredients),
  dayPlans: many(dayPlans, { relationName: "dayPlanRecipe" }),
  snackDayPlans: many(dayPlans, { relationName: "dayPlanSnack" }),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
}));

export const weekPlansRelations = relations(weekPlans, ({ one, many }) => ({
  family: one(families, { fields: [weekPlans.familyId], references: [families.id] }),
  dayPlans: many(dayPlans),
}));

export const dayPlansRelations = relations(dayPlans, ({ one }) => ({
  weekPlan: one(weekPlans, { fields: [dayPlans.weekPlanId], references: [weekPlans.id] }),
  recipe: one(recipes, { fields: [dayPlans.recipeId], references: [recipes.id], relationName: "dayPlanRecipe" }),
  snackRecipe: one(recipes, { fields: [dayPlans.snackRecipeId], references: [recipes.id], relationName: "dayPlanSnack" }),
}));
