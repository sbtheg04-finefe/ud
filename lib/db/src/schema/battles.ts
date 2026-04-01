import { pgTable, serial, text, timestamp, integer, pgEnum, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const battleStatusEnum = pgEnum("battle_status", ["draft", "open", "live", "judging", "completed", "archived"]);
export const battleScopeEnum = pgEnum("battle_scope", ["private", "circle", "local", "public", "global"]);
export const challengeTypeEnum = pgEnum("challenge_type", ["solo_remake", "team_battle", "remix_battle", "speed_battle", "budget_battle", "ingredient_restriction", "culture_variation"]);
export const sourceTypeEnum = pgEnum("source_type", ["meal", "video", "external"]);
export const entryStatusEnum = pgEnum("entry_status", ["draft", "submitted", "approved", "disqualified"]);
export const intentTypeEnum = pgEnum("intent_type", ["viewed", "saved", "wants_to_join", "opened_prep", "shared"]);
export const teamMemberRoleEnum = pgEnum("team_member_role", ["captain", "member"]);

export const battlesTable = pgTable("battles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sourceType: sourceTypeEnum("source_type").notNull().default("meal"),
  sourceMealId: integer("source_meal_id"),
  sourceVideoId: integer("source_video_id"),
  challengeType: challengeTypeEnum("challenge_type").notNull().default("solo_remake"),
  scopeType: battleScopeEnum("scope_type").notNull().default("public"),
  battleStatus: battleStatusEnum("battle_status").notNull().default("open"),
  groupId: integer("group_id"),
  createdBy: integer("created_by").notNull(),
  battleWorthinessScore: real("battle_worthiness_score").notNull().default(0),
  maxTeamSize: integer("max_team_size").notNull().default(4),
  registrationStart: timestamp("registration_start", { withTimezone: true }),
  registrationEnd: timestamp("registration_end", { withTimezone: true }),
  prepStart: timestamp("prep_start", { withTimezone: true }),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
  judgingEnd: timestamp("judging_end", { withTimezone: true }),
  participantCount: integer("participant_count").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const battleRequirementsTable = pgTable("battle_requirements", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  ingredientList: text("ingredient_list").array().notNull().default([]),
  optionalSubstitutions: text("optional_substitutions").array().notNull().default([]),
  toolList: text("tool_list").array().notNull().default([]),
  estimatedCostMin: integer("estimated_cost_min"),
  estimatedCostMax: integer("estimated_cost_max"),
  estimatedTimeMinutes: integer("estimated_time_minutes"),
  difficultyLevel: integer("difficulty_level").notNull().default(2),
  dietaryNotes: text("dietary_notes").array().notNull().default([]),
  regionNotes: text("region_notes"),
});

export const battleTeamsTable = pgTable("battle_teams", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  groupId: integer("group_id"),
  teamName: text("team_name").notNull(),
  captainUserId: integer("captain_user_id").notNull(),
  totalScore: real("total_score").notNull().default(0),
  rank: integer("rank"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const battleTeamMembersTable = pgTable("battle_team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  role: teamMemberRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const battleEntriesTable = pgTable("battle_entries", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"),
  photoUrl: text("photo_url"),
  videoUrl: text("video_url"),
  caption: text("caption"),
  journalNote: text("journal_note"),
  substitutionsUsed: text("substitutions_used").array().notNull().default([]),
  status: entryStatusEnum("status").notNull().default("submitted"),
  completionScore: real("completion_score").notNull().default(0),
  creativityScore: real("creativity_score").notNull().default(0),
  presentationScore: real("presentation_score").notNull().default(0),
  peerVotes: integer("peer_votes").notNull().default(0),
  totalScore: real("total_score").notNull().default(0),
  rank: integer("rank"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const battleInterestTable = pgTable("battle_interest", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id"),
  sourceMealId: integer("source_meal_id"),
  sourceVideoId: integer("source_video_id"),
  userId: integer("user_id").notNull(),
  intentType: intentTypeEnum("intent_type").notNull().default("viewed"),
  locationSnapshot: text("location_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const battleRoundsTable = pgTable("battle_rounds", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  title: text("title"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
});

export const insertBattleSchema = createInsertSchema(battlesTable).omit({
  id: true, createdAt: true, participantCount: true, entryCount: true, battleWorthinessScore: true
});
export const insertBattleEntrySchema = createInsertSchema(battleEntriesTable).omit({
  id: true, submittedAt: true, totalScore: true, rank: true, completionScore: true, creativityScore: true, presentationScore: true, peerVotes: true
});

export type Battle = typeof battlesTable.$inferSelect;
export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type BattleEntry = typeof battleEntriesTable.$inferSelect;
export type InsertBattleEntry = z.infer<typeof insertBattleEntrySchema>;
export type BattleRequirements = typeof battleRequirementsTable.$inferSelect;
export type BattleTeam = typeof battleTeamsTable.$inferSelect;
export type BattleInterest = typeof battleInterestTable.$inferSelect;
