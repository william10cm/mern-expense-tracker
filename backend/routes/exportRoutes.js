import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(requireAuth);

// Parse "YYYY-MM" into start/end dates (UTC)
function getMonthRange(monthStr) {
  monthStr = (monthStr || "").trim();
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end, month: monthStr };
}

// Escape CSV values safely
function csvEscape(value) {
  const s = String(value ?? "");
  // If it contains comma, quote, or newline → wrap in quotes and escape quotes
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/exports/transactions?month=YYYY-MM
router.get("/transactions", async (req, res) => {
  try {
    const range = getMonthRange(req.query.month);
    if (!range) return res.status(400).json({ message: 'Invalid month format. Use "YYYY-MM".' });

    const { start, end, month } = range;

    const tx = await Transaction.find({
      user: new mongoose.Types.ObjectId(req.userId),
      date: { $gte: start, $lt: end }
    })
      .populate("category", "name")
      .sort({ date: 1, createdAt: 1 });

    const header = ["date", "type", "category", "description", "amount"];
    const rows = tx.map((t) => ([
      String(t.date).slice(0, 10),
      t.type,
      t.category?.name || "",
      t.description || "",
      Number(t.amount).toFixed(2)
    ]));

    const csv = [
      header.join(","),
      ...rows.map((r) => r.map(csvEscape).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="transactions-${month}.csv"`);

    return res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
