import { Router } from "express";
import { db, usersTable, partnerProfilesTable, judgeProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSessionId, getSession, updateSession } from "../lib/auth";

const router = Router();

router.get("/onboarding/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    onboardingCompleted: user.onboardingCompleted,
    roles: user.roles,
    userId: user.id,
  });
});

router.post("/onboarding/complete", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const {
    roles = ["user"],
    displayName,
    username,
    bio,
    referralCode,
    partnerProfile,
    judgeProfile,
  } = req.body;

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (referralCode && referralCode !== existingUser.referralCode) {
    const [referrer] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode));
    if (referrer) {
      await db.update(usersTable)
        .set({ referredById: referrer.id })
        .where(eq(usersTable.id, userId));
    }
  }

  let newUsername = existingUser.username;
  if (username && username !== existingUser.username) {
    const [conflict] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (!conflict) newUsername = username;
  }

  const [updated] = await db.update(usersTable).set({
    roles,
    onboardingCompleted: true,
    displayName: displayName || existingUser.displayName,
    bio: bio || existingUser.bio,
    username: newUsername,
  }).where(eq(usersTable.id, userId)).returning();

  if (roles.includes("partner") && partnerProfile) {
    const { brandName, brandCategory, billingEmail, website, logoUrl } = partnerProfile;
    await db.insert(partnerProfilesTable).values({
      userId,
      brandName: brandName || "My Brand",
      brandCategory: brandCategory || "Food & Beverage",
      billingEmail: billingEmail || existingUser.email,
      website: website || null,
      logoUrl: logoUrl || null,
    }).onConflictDoUpdate({
      target: partnerProfilesTable.userId,
      set: { brandName, brandCategory, billingEmail, website, logoUrl },
    });
  }

  if (roles.includes("judge") && judgeProfile) {
    const { credentials, specialties, bio: judgeBio, yearsExperience } = judgeProfile;
    await db.insert(judgeProfilesTable).values({
      userId,
      credentials: credentials || null,
      specialties: specialties || [],
      bio: judgeBio || null,
      yearsExperience: yearsExperience || 0,
    }).onConflictDoUpdate({
      target: judgeProfilesTable.userId,
      set: { credentials, specialties, bio: judgeBio, yearsExperience },
    });
  }

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      await updateSession(sid, {
        ...session,
        user: {
          ...session.user,
          roles: updated.roles,
          onboardingCompleted: true,
          displayName: updated.displayName,
          username: updated.username,
        },
      });
    }
  }

  res.json({
    user: {
      ...req.user,
      roles: updated.roles,
      onboardingCompleted: true,
      displayName: updated.displayName,
    },
  });
});

export default router;
