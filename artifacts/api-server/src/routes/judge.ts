import { Router } from "express";
import { db, judgeProfilesTable, judgeAssignmentsTable, battlesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/judge/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [profile] = await db.select().from(judgeProfilesTable)
    .where(eq(judgeProfilesTable.userId, req.user.id));
  if (!profile) {
    res.status(404).json({ error: "No judge profile found" });
    return;
  }
  res.json(profile);
});

router.post("/judge/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const { credentials, specialties, bio, yearsExperience } = req.body;

  const [profile] = await db.insert(judgeProfilesTable).values({
    userId,
    credentials: credentials || null,
    specialties: specialties || [],
    bio: bio || null,
    yearsExperience: yearsExperience || 0,
  }).onConflictDoUpdate({
    target: judgeProfilesTable.userId,
    set: { credentials, specialties, bio, yearsExperience },
  }).returning();

  res.json(profile);
});

router.get("/judge/assignments", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const assignments = await db.select({
    assignment: judgeAssignmentsTable,
    battle: battlesTable,
  })
    .from(judgeAssignmentsTable)
    .innerJoin(battlesTable, eq(judgeAssignmentsTable.battleId, battlesTable.id))
    .where(eq(judgeAssignmentsTable.judgeUserId, req.user.id));

  const results = await Promise.all(assignments.map(async ({ assignment, battle }) => {
    const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, battle.createdBy));
    return {
      ...assignment,
      battle: { ...battle, creator, sourceMeal: null, sourceVideo: null, topEntries: [] },
    };
  }));

  res.json(results);
});

router.post("/judge/assignments/:id/accept", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const assignmentId = parseInt(req.params.id);
  const [assignment] = await db.select().from(judgeAssignmentsTable)
    .where(eq(judgeAssignmentsTable.id, assignmentId));

  if (!assignment || assignment.judgeUserId !== req.user.id) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  const [updated] = await db.update(judgeAssignmentsTable)
    .set({ isAccepted: true })
    .where(eq(judgeAssignmentsTable.id, assignmentId))
    .returning();

  const [battle] = await db.select().from(battlesTable)
    .where(eq(battlesTable.id, updated.battleId));
  const [creator] = await db.select().from(usersTable)
    .where(eq(usersTable.id, battle.createdBy));

  res.json({
    ...updated,
    battle: { ...battle, creator, sourceMeal: null, sourceVideo: null, topEntries: [] },
  });
});

export default router;
