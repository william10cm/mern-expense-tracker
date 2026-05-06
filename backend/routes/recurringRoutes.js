import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import RecurringRule from "../models/RecurringRule.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(requireAuth);

function parseMonth(monthStr) {
  monthStr = (monthStr || "").trim();
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { y, m, month: monthStr };
}

// GET /api/recurring (list rules)
router.get("/", async (req, res) => {
  try {
    const rules = await RecurringRule.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/recurring (create rule)
router.post("/", async (req, res) => {
  try {
    const { type, amount, description, category, dayOfMonth, isActive } = req.body;

    if (amount === undefined || amount === null) return res.status(400).json({ message: "Amount is required." });
    if (!category) return res.status(400).json({ message: "Category is required." });
    if (!dayOfMonth) return res.status(400).json({ message: "dayOfMonth is required (1-28)." });

    if (!mongoose.Types.ObjectId.isValid(category)) return res.status(400).json({ message: "Invalid category id." });

    const cat = await Category.findOne({ _id: category, user: req.userId });
    if (!cat) return res.status(404).json({ message: "Category not found." });

    const rule = await RecurringRule.create({
      user: req.userId,
      type: type || "expense",
      amount: Number(amount),
      description: description?.trim() || "",
      category,
      dayOfMonth: Number(dayOfMonth),
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({ rule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/recurring/:id (update rule)
router.patch("/:id", async (req, res) => {
  try {
    const { type, amount, description, category, dayOfMonth, isActive } = req.body;

    const update = {};
    if (type !== undefined) update.type = type;
    if (amount !== undefined) update.amount = Number(amount);
    if (description !== undefined) update.description = description.trim();
    if (dayOfMonth !== undefined) update.dayOfMonth = Number(dayOfMonth);
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) return res.status(400).json({ message: "Invalid category id." });
      const cat = await Category.findOne({ _id: category, user: req.userId });
      if (!cat) return res.status(404).json({ message: "Category not found." });
      update.category = category;
    }

    const rule = await RecurringRule.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      update,
      { new: true, runValidators: true }
    );

    if (!rule) return res.status(404).json({ message: "Rule not found." });

    res.json({ rule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/recurring/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await RecurringRule.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: "Rule not found." });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/recurring/generate?month=YYYY-MM
router.post("/generate", async (req, res) => {
  try {
    const parsed = parseMonth(req.query.month);
    if (!parsed) return res.status(400).json({ message: 'Invalid month format. Use "YYYY-MM".' });

    const { y, m, month } = parsed;

    const rules = await RecurringRule.find({ user: req.userId, isActive: true });

    let createdCount = 0;

    for (const r of rules) {
      // date in UTC: y, m-1, dayOfMonth
      const date = new Date(Date.UTC(y, m - 1, r.dayOfMonth, 0, 0, 0));


      const exists = await Transaction.findOne({
        user: req.userId,
        recurringRule: r._id,
        date
      });

      if (!exists) {
        await Transaction.create({
          user: req.userId,
          type: r.type,
          amount: r.amount,
          category: r.category,
          date,
          description: r.description || "",
          recurringRule: r._id
        });
        createdCount++;
      }
    }

    res.json({ ok: true, month, createdCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
