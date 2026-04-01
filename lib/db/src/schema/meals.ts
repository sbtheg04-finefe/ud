import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack", "dessert", "brunch", "other"]);
export const shareStatusEnum = pgEnum("share_status", ["idea", "cooking", "available", "finished"]);

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  groupId: integer("group_id"),
  title: text("title").notNull(),
  description: text("description"),
  mealType: mealTypeEnum("meal_type").notNull().default("other"),
  cuisineTags: text("cuisine_tags").array().notNull().default([]),
  dietaryTags: text("dietary_tags").array().notNull().default([]),
  imageUrl: text("image_url"),
  servings: integer("servings"),
  shareStatus: shareStatusEnum("share_status").notNull().default("idea"),
  locationText: text("location_text"),
  ingredientsSummary: text("ingredients_summary"),
  instructionsSummary: text("instructions_summary"),
  likeCount: integer("like_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMealSchema = createInsertSchema(mealsTable).omit({ id: true, createdAt: true, likeCount: true, saveCount: true, commentCount: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;
