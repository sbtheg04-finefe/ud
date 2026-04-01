import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import groupsRouter from "./groups";
import mealsRouter from "./meals";
import videosRouter from "./videos";
import feedRouter from "./feed";
import engagementRouter from "./engagement";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/groups", groupsRouter);
router.use("/meals", mealsRouter);
router.use("/videos", videosRouter);
router.use("/feed", feedRouter);
router.use(engagementRouter);

export default router;
