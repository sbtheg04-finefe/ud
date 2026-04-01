import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const groupVisibilityEnum = pgEnum("group_visibility", ["public", "private", "invite_only"]);
export const groupMemberRoleEnum = pgEnum("group_member_role", ["member", "moderator", "admin"]);

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  visibility: groupVisibilityEnum("visibility").notNull().default("public"),
  createdById: integer("created_by_id").notNull(),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembershipsTable = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  groupId: integer("group_id").notNull(),
  role: groupMemberRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true });
export const insertGroupMembershipSchema = createInsertSchema(groupMembershipsTable).omit({ id: true, joinedAt: true });

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;
export type Group = typeof groupsTable.$inferSelect;
export type GroupMembership = typeof groupMembershipsTable.$inferSelect;
