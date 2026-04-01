import { Router } from "express";
import { db } from "@workspace/db";
import { mealsTable, usersTable, groupsTable, groupMembershipsTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { CreateMealBody, UpdateMealBody, ListMealsQueryParams } from "@workspace/api-zod";

const router = Router();

async function enrichMeal(meal: typeof mealsTable.$inferSelect) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, meal.authorId));
  let group = null;
  if (meal.groupId) {
    const [g] = await db.select().from(groupsTable).where(eq(groupsTable.id, meal.groupId));
    if (g) {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, g.id));
      group = { ...g, memberCount: Number(memberCount) };
    }
  }
  return { ...meal, author, group };
}

router.get("/trending", async (req, res) => {
  const params = ListMealsQueryParams.parse(req.query);
  const limit = params.limit ?? 10;
  const meals = await db
    .select()
    .from(mealsTable)
    .orderBy(desc(mealsTable.likeCount), desc(mealsTable.saveCount))
    .limit(limit);
  const enriched = await Promise.all(meals.map(enrichMeal));
  res.json(enriched);
});

router.get("/", async (req, res) => {
  const params = ListMealsQueryParams.parse(req.query);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  let query = db.select().from(mealsTable).$dynamic();
  const conditions = [];

  if (params.groupId) conditions.push(eq(mealsTable.groupId, params.groupId));
  if (params.authorId) conditions.push(eq(mealsTable.authorId, params.authorId));
  if (params.mealType) conditions.push(eq(mealsTable.mealType, params.mealType as any));
  if (params.shareStatus) conditions.push(eq(mealsTable.shareStatus, params.shareStatus as any));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const meals = await query.orderBy(desc(mealsTable.createdAt)).limit(limit).offset(offset);
  const enriched = await Promise.all(meals.map(enrichMeal));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const body = CreateMealBody.parse(req.body);
  const [meal] = await db.insert(mealsTable).values({
    authorId: body.authorId,
    groupId: body.groupId ?? null,
    title: body.title,
    description: body.description ?? null,
    mealType: (body.mealType as any) ?? "other",
    cuisineTags: body.cuisineTags ?? [],
    dietaryTags: body.dietaryTags ?? [],
    imageUrl: body.imageUrl ?? null,
    servings: body.servings ?? null,
    shareStatus: (body.shareStatus as any) ?? "idea",
    locationText: body.locationText ?? null,
    ingredientsSummary: body.ingredientsSummary ?? null,
    instructionsSummary: body.instructionsSummary ?? null,
  }).returning();
  const enriched = await enrichMeal(meal);
  res.status(201).json(enriched);
});

router.get("/:mealId", async (req, res) => {
  const mealId = parseInt(req.params.mealId);
  const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, mealId));
  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }
  const enriched = await enrichMeal(meal);
  res.json(enriched);
});

router.patch("/:mealId", async (req, res) => {
  const mealId = parseInt(req.params.mealId);
  const body = UpdateMealBody.parse(req.body);
  const [meal] = await db.update(mealsTable).set({
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.mealType !== undefined && { mealType: body.mealType as any }),
    ...(body.cuisineTags !== undefined && { cuisineTags: body.cuisineTags }),
    ...(body.dietaryTags !== undefined && { dietaryTags: body.dietaryTags }),
    ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
    ...(body.servings !== undefined && { servings: body.servings }),
    ...(body.shareStatus !== undefined && { shareStatus: body.shareStatus as any }),
    ...(body.locationText !== undefined && { locationText: body.locationText }),
    ...(body.ingredientsSummary !== undefined && { ingredientsSummary: body.ingredientsSummary }),
    ...(body.instructionsSummary !== undefined && { instructionsSummary: body.instructionsSummary }),
  }).where(eq(mealsTable.id, mealId)).returning();
  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }
  const enriched = await enrichMeal(meal);
  res.json(enriched);
});

router.delete("/:mealId", async (req, res) => {
  const mealId = parseInt(req.params.mealId);
  await db.delete(mealsTable).where(eq(mealsTable.id, mealId));
  res.status(204).send();
});

export default router;
