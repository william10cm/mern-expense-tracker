import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getByCategory, getSummary, getTrend } from "../controllers/reportController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/summary", getSummary);

router.get("/by-category", getByCategory);

router.get("/trend", getTrend);

export default router;
