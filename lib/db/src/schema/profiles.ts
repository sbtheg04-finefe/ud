import { pgTable, serial, integer, text, timestamp, boolean, real, pgEnum } from "drizzle-orm/pg-core";

export const judgeSpecialtyEnum = pgEnum("judge_specialty", [
  "technique", "flavor", "presentation", "innovation", "budget", "speed", "culture"
]);

export const partnerProfilesTable = pgTable("partner_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  brandName: text("brand_name").notNull(),
  brandCategory: text("brand_category").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  billingEmail: text("billing_email").notNull(),
  monthlyBudget: real("monthly_budget").notNull().default(0),
  activeSponsorships: integer("active_sponsorships").notNull().default(0),
  totalSponsored: integer("total_sponsored").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const judgeProfilesTable = pgTable("judge_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  credentials: text("credentials"),
  specialties: judgeSpecialtyEnum("specialties").array().notNull().default([]),
  bio: text("bio"),
  yearsExperience: integer("years_experience").notNull().default(0),
  totalJudged: integer("total_judged").notNull().default(0),
  averageRating: real("average_rating"),
  isVerified: boolean("is_verified").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  judgeGroupId: integer("judge_group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const judgeAssignmentsTable = pgTable("judge_assignments", {
  id: serial("id").primaryKey(),
  judgeUserId: integer("judge_user_id").notNull(),
  battleId: integer("battle_id").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  isAccepted: boolean("is_accepted").notNull().default(false),
  compensationAmount: real("compensation_amount").notNull().default(0),
});

export const battleSponsorshipsTable = pgTable("battle_sponsorships", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  partnerUserId: integer("partner_user_id").notNull(),
  sponsorshipAmount: real("sponsorship_amount").notNull().default(0),
  prizeDescription: text("prize_description"),
  logoUrl: text("logo_url"),
  visibilityBoost: real("visibility_boost").notNull().default(1.0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerProfile = typeof partnerProfilesTable.$inferSelect;
export type JudgeProfile = typeof judgeProfilesTable.$inferSelect;
export type JudgeAssignment = typeof judgeAssignmentsTable.$inferSelect;
export type BattleSponsorship = typeof battleSponsorshipsTable.$inferSelect;
