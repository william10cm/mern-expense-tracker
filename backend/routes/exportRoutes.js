import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { exportTransactions } from "../controllers/exportController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/transactions", exportTransactions);

export default router;
