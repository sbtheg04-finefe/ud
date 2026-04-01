import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  locationText: text("location_text"),
  dietaryPreferences: text("dietary_preferences").array().notNull().default([]),
  cookingInterests: text("cooking_interests").array().notNull().default([]),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
