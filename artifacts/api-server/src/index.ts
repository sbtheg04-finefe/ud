import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { populateHacks, setLastPopulateResult, setNextScheduledRun } from "./lib/hack-populator";
import { db } from "@workspace/db";
import { videosTable, usersTable } from "@workspace/db/schema";
import { count, eq, asc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const adminEmail = process.env["ADMIN_EMAIL"];
  if (adminEmail) {
    const [existingAdmin] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
    if (!existingAdmin) {
      const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
      if (targetUser) {
        await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, targetUser.id));
        logger.info({ userId: targetUser.id, email: adminEmail }, "Auto-promoted user to admin via ADMIN_EMAIL");
      } else {
        logger.warn({ adminEmail }, "ADMIN_EMAIL user not found in database");
      }
    }
  }

  const [{ value: existingCount }] = await db.select({ value: count() }).from(videosTable);
  if (Number(existingCount) < 20) {
    logger.info("Seeding initial hacks from TheMealDB...");
    try {
      const result = await populateHacks(30);
      setLastPopulateResult(result);
      logger.info({ inserted: result.inserted, total: result.total }, "Initial hack seed complete");
    } catch (err) {
      logger.warn({ err }, "Initial hack seed failed (non-fatal)");
    }
  }

  const nextRun = new Date();
  nextRun.setHours(6, 0, 0, 0);
  if (nextRun <= new Date()) nextRun.setDate(nextRun.getDate() + 1);
  setNextScheduledRun(nextRun.toISOString());

  cron.schedule("0 6 * * *", async () => {
    logger.info("Running daily hack population cron...");
    try {
      const result = await populateHacks(20);
      setLastPopulateResult(result);
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 0, 0);
      setNextScheduledRun(next.toISOString());
      logger.info({ inserted: result.inserted, total: result.total }, "Daily hack population complete");
    } catch (err) {
      logger.error({ err }, "Daily hack population failed");
    }
  }, { timezone: "America/New_York" });

  logger.info({ nextRun: nextRun.toISOString() }, "Daily hack cron scheduled");
});
