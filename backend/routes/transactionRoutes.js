import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction
} from "../controllers/transactionController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", getTransactions);

router.post("/", createTransaction);

router.patch("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);

export default router;
