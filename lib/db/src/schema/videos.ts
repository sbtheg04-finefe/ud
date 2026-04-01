import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  linkedMealId: integer("linked_meal_id"),
  groupId: integer("group_id"),
  title: text("title").notNull(),
  caption: text("caption"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  tags: text("tags").array().notNull().default([]),
  likeCount: integer("like_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true, likeCount: true, saveCount: true, commentCount: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
