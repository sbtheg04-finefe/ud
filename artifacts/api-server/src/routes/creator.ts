import { Router } from "express";
import { db } from "@workspace/db";
import {
  creatorProductsTable,
  creatorSessionsTable,
  sessionBookingsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

function authedUserId(req: any): number | null {
  if (!req.isAuthenticated || !req.isAuthenticated()) return null;
  return req.user?.id ?? null;
}

// ── Products ──────────────────────────────────────────────────────────────────

router.get("/creator/products", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const products = await db
    .select()
    .from(creatorProductsTable)
    .where(eq(creatorProductsTable.creatorId, userId))
    .orderBy(desc(creatorProductsTable.createdAt));
  res.json(products);
});

router.post("/creator/products", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { title, description, productType, priceInCents, fileUrl, accessLink, coverImageUrl } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const [product] = await db
    .insert(creatorProductsTable)
    .values({
      creatorId: userId,
      title,
      description: description ?? null,
      productType: productType ?? "ebook",
      priceInCents: Number(priceInCents ?? 0),
      fileUrl: fileUrl ?? null,
      accessLink: accessLink ?? null,
      coverImageUrl: coverImageUrl ?? null,
      status: "draft",
    })
    .returning();
  res.status(201).json(product);
});

router.patch("/creator/products/:id", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [existing] = await db.select().from(creatorProductsTable).where(eq(creatorProductsTable.id, id));
  if (!existing || existing.creatorId !== userId) return res.status(404).json({ error: "Not found" });
  const { title, description, productType, priceInCents, fileUrl, accessLink, coverImageUrl, status } = req.body;
  const [updated] = await db
    .update(creatorProductsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(productType !== undefined && { productType }),
      ...(priceInCents !== undefined && { priceInCents: Number(priceInCents) }),
      ...(fileUrl !== undefined && { fileUrl }),
      ...(accessLink !== undefined && { accessLink }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(eq(creatorProductsTable.id, id))
    .returning();
  res.json(updated);
});

router.delete("/creator/products/:id", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [existing] = await db.select().from(creatorProductsTable).where(eq(creatorProductsTable.id, id));
  if (!existing || existing.creatorId !== userId) return res.status(404).json({ error: "Not found" });
  await db.delete(creatorProductsTable).where(eq(creatorProductsTable.id, id));
  res.json({ ok: true });
});

// ── Sessions ──────────────────────────────────────────────────────────────────

router.get("/creator/sessions", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const sessions = await db
    .select()
    .from(creatorSessionsTable)
    .where(eq(creatorSessionsTable.creatorId, userId))
    .orderBy(desc(creatorSessionsTable.createdAt));
  res.json(sessions);
});

router.post("/creator/sessions", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { title, description, sessionType, durationMinutes, priceInCents, confirmationMessage } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const [session] = await db
    .insert(creatorSessionsTable)
    .values({
      creatorId: userId,
      title,
      description: description ?? null,
      sessionType: sessionType ?? "video_call",
      durationMinutes: Number(durationMinutes ?? 60),
      priceInCents: Number(priceInCents ?? 0),
      confirmationMessage: confirmationMessage ?? null,
      status: "draft",
    })
    .returning();
  res.status(201).json(session);
});

router.patch("/creator/sessions/:id", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [existing] = await db.select().from(creatorSessionsTable).where(eq(creatorSessionsTable.id, id));
  if (!existing || existing.creatorId !== userId) return res.status(404).json({ error: "Not found" });
  const { title, description, sessionType, durationMinutes, priceInCents, confirmationMessage, status } = req.body;
  const [updated] = await db
    .update(creatorSessionsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(sessionType !== undefined && { sessionType }),
      ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
      ...(priceInCents !== undefined && { priceInCents: Number(priceInCents) }),
      ...(confirmationMessage !== undefined && { confirmationMessage }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(eq(creatorSessionsTable.id, id))
    .returning();
  res.json(updated);
});

router.delete("/creator/sessions/:id", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [existing] = await db.select().from(creatorSessionsTable).where(eq(creatorSessionsTable.id, id));
  if (!existing || existing.creatorId !== userId) return res.status(404).json({ error: "Not found" });
  await db.delete(creatorSessionsTable).where(eq(creatorSessionsTable.id, id));
  res.json({ ok: true });
});

router.post("/creator/sessions/:id/book", async (req, res) => {
  const userId = authedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const { message } = req.body;
  const [session] = await db.select().from(creatorSessionsTable).where(eq(creatorSessionsTable.id, id));
  if (!session || session.status !== "published") return res.status(404).json({ error: "Session not found" });
  const [booking] = await db
    .insert(sessionBookingsTable)
    .values({ sessionId: id, participantId: userId, message: message ?? null, status: "pending" })
    .returning();
  await db.update(creatorSessionsTable)
    .set({ bookingCount: session.bookingCount + 1 })
    .where(eq(creatorSessionsTable.id, id));
  res.status(201).json(booking);
});

// ── Public creator profile ────────────────────────────────────────────────────

router.get("/creator/:userId/profile", async (req, res) => {
  const userId = Number(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(404).json({ error: "Not found" });
  const products = await db
    .select()
    .from(creatorProductsTable)
    .where(and(eq(creatorProductsTable.creatorId, userId), eq(creatorProductsTable.status, "published")));
  const sessions = await db
    .select()
    .from(creatorSessionsTable)
    .where(and(eq(creatorSessionsTable.creatorId, userId), eq(creatorSessionsTable.status, "published")));
  res.json({ user, products, sessions });
});

// ── Creator discovery ─────────────────────────────────────────────────────────

router.get("/creators", async (_req, res) => {
  const creators = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
      cookingInterests: usersTable.cookingInterests,
    })
    .from(usersTable)
    .limit(50);
  res.json(creators);
});

export default router;
