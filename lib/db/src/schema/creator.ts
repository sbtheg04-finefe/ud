import { pgTable, serial, text, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const productTypeEnum = pgEnum("product_type", [
  "ebook", "recipe_pack", "guide", "meal_plan", "template",
]);
export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);
export const sessionTypeEnum = pgEnum("session_type", [
  "video_call", "phone", "in_person", "cook_along",
]);

export const creatorProductsTable = pgTable("creator_products", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  productType: productTypeEnum("product_type").notNull().default("ebook"),
  priceInCents: integer("price_in_cents").notNull().default(0),
  fileUrl: text("file_url"),
  accessLink: text("access_link"),
  status: productStatusEnum("status").notNull().default("draft"),
  purchaseCount: integer("purchase_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorSessionsTable = pgTable("creator_sessions", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sessionType: sessionTypeEnum("session_type").notNull().default("video_call"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  priceInCents: integer("price_in_cents").notNull().default(0),
  status: productStatusEnum("status").notNull().default("draft"),
  confirmationMessage: text("confirmation_message"),
  bookingCount: integer("booking_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionBookingsTable = pgTable("session_bookings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => creatorSessionsTable.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productPurchasesTable = pgTable("product_purchases", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => creatorProductsTable.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountPaidInCents: integer("amount_paid_in_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreatorProductSchema = createInsertSchema(creatorProductsTable).omit({ id: true, createdAt: true, updatedAt: true, purchaseCount: true });
export const insertCreatorSessionSchema = createInsertSchema(creatorSessionsTable).omit({ id: true, createdAt: true, updatedAt: true, bookingCount: true });

export type CreatorProduct = typeof creatorProductsTable.$inferSelect;
export type InsertCreatorProduct = z.infer<typeof insertCreatorProductSchema>;
export type CreatorSession = typeof creatorSessionsTable.$inferSelect;
export type InsertCreatorSession = z.infer<typeof insertCreatorSessionSchema>;
export type SessionBooking = typeof sessionBookingsTable.$inferSelect;
