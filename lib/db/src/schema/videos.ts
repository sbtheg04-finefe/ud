import { pgTable, serial, text, timestamp, integer, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const HACK_STATUSES = ["submitted", "community_voting", "ai_reviewing", "approved", "challenged", "rejected"] as const;
export type HackStatus = typeof HACK_STATUSES[number];

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  linkedMealId: integer("linked_meal_id"),
  groupId: integer("group_id"),
  title: text("title").notNull(),
  caption: text("caption"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  photoUrl: text("photo_url"),
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform"),
  durationSeconds: integer("duration_seconds"),
  tags: text("tags").array().notNull().default([]),
  likeCount: integer("like_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  hackStatus: text("hack_status").notNull().default("submitted"),
  communityUpvotes: integer("community_upvotes").notNull().default(0),
  communityDownvotes: integer("community_downvotes").notNull().default(0),
  aiScore: numeric("ai_score", { precision: 4, scale: 2 }),
  aiAnalysis: text("ai_analysis"),
  aiReviewedAt: timestamp("ai_reviewed_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  creativeEngagementScore: integer("creative_engagement_score").notNull().default(0),
  ingredients: text("ingredients").array().notNull().default([]),
  battleScore: numeric("battle_score", { precision: 4, scale: 2 }),
  populatedAt: timestamp("populated_at", { withTimezone: true }),
  isDemo: integer("is_demo").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const hackVotesTable = pgTable("hack_votes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: integer("user_id").notNull(),
  voteType: text("vote_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("hack_votes_video_user_unique").on(t.videoId, t.userId)]);

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true, likeCount: true, saveCount: true, commentCount: true, communityUpvotes: true, communityDownvotes: true, creativeEngagementScore: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
export type HackVote = typeof hackVotesTable.$inferSelect;
