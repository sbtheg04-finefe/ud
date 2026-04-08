import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import groupsRouter from "./groups";
import mealsRouter from "./meals";
import videosRouter from "./videos";
import feedRouter from "./feed";
import engagementRouter from "./engagement";
import battlesRouter from "./battles";
import onboardingRouter from "./onboarding";
import partnerRouter from "./partner";
import judgeRouter from "./judge";
import eventsRouter from "./events";
import storageRouter from "./storage";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(eventsRouter);
router.use("/users", usersRouter);
router.use("/groups", groupsRouter);
router.use("/meals", mealsRouter);
router.use("/videos", videosRouter);
router.use("/feed", feedRouter);
router.use(engagementRouter);
router.use("/battles", battlesRouter);
router.use(onboardingRouter);
router.use(partnerRouter);
router.use(judgeRouter);
router.use("/storage", storageRouter);
router.use("/ai", aiRouter);

export default router;
