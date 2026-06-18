import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createRecurringRule,
  deleteRecurringRule,
  generateRecurringTransactions,
  getRecurringRules,
  updateRecurringRule
} from "../controllers/recurringController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", getRecurringRules);

router.post("/", createRecurringRule);

router.patch("/:id", updateRecurringRule);

router.delete("/:id", deleteRecurringRule);

router.post("/generate", generateRecurringTransactions);

export default router;
