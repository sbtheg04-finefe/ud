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

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
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

export default router;
