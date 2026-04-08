import { pgTable, serial, text, timestamp, integer, boolean, date, jsonb } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userWeeklyPointsTable = pgTable("user_weekly_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: integer("points").notNull().default(0),
  reason: text("reason").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type UserWeeklyPoints = typeof userWeeklyPointsTable.$inferSelect;
