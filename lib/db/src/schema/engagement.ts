import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const targetTypeEnum = pgEnum("target_type", ["meal", "video"]);
export const reactionTypeEnum = pgEnum("reaction_type", ["like", "love", "yum"]);

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetType: targetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reactionType: reactionTypeEnum("reaction_type").notNull().default("like"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savesTable = pgTable("saves", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetType: targetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetType: targetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReactionSchema = createInsertSchema(reactionsTable).omit({ id: true, createdAt: true });
export const insertSaveSchema = createInsertSchema(savesTable).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });

export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type InsertSave = z.infer<typeof insertSaveSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Reaction = typeof reactionsTable.$inferSelect;
export type Save = typeof savesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
