import { Router } from "express";
import { db, partnerProfilesTable, battleSponsorshipsTable, battlesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/partner/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [profile] = await db.select().from(partnerProfilesTable)
    .where(eq(partnerProfilesTable.userId, req.user.id));
  if (!profile) {
    res.status(404).json({ error: "No partner profile found" });
    return;
  }
  res.json(profile);
});

router.post("/partner/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const { brandName, brandCategory, billingEmail, website, logoUrl } = req.body;

  const [profile] = await db.insert(partnerProfilesTable).values({
    userId,
    brandName: brandName || "My Brand",
    brandCategory: brandCategory || "Food & Beverage",
    billingEmail: billingEmail || req.user.email || "",
    website: website || null,
    logoUrl: logoUrl || null,
  }).onConflictDoUpdate({
    target: partnerProfilesTable.userId,
    set: { brandName, brandCategory, billingEmail, website, logoUrl },
  }).returning();

  res.json(profile);
});

router.get("/partner/battles", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const sponsorships = await db.select({
    sponsorship: battleSponsorshipsTable,
    battle: battlesTable,
  })
    .from(battleSponsorshipsTable)
    .innerJoin(battlesTable, eq(battleSponsorshipsTable.battleId, battlesTable.id))
    .where(eq(battleSponsorshipsTable.partnerUserId, req.user.id));

  const results = await Promise.all(sponsorships.map(async ({ battle, sponsorship }) => {
    const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, battle.createdBy));
    return { ...battle, creator, sponsorship, sourceMeal: null, sourceVideo: null, topEntries: [] };
  }));

  res.json(results);
});

router.post("/partner/sponsor", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { battleId, sponsorshipAmount, prizeDescription, logoUrl } = req.body;
  if (!battleId) {
    res.status(400).json({ error: "battleId is required" });
    return;
  }

  const [sponsorship] = await db.insert(battleSponsorshipsTable).values({
    battleId,
    partnerUserId: req.user.id,
    sponsorshipAmount: sponsorshipAmount || 0,
    prizeDescription: prizeDescription || null,
    logoUrl: logoUrl || null,
    visibilityBoost: 1.5,
  }).returning();

  await db.update(partnerProfilesTable)
    .set({ activeSponsorships: 1, totalSponsored: 1 })
    .where(eq(partnerProfilesTable.userId, req.user.id));

  res.json(sponsorship);
});

export default router;
