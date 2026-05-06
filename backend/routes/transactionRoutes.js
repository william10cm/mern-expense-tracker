import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// Helper: parse YYYY-MM into start/end Date
function getMonthRange(monthStr) {
  // monthStr format: "2026-02"
  const [y, m] = (monthStr || "").split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  // Use UTC boundaries to avoid timezone surprises
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // next month
  return { start, end };
}

// GET /api/transactions?month=YYYY-MM&category=<id>&type=expense|income
router.get("/", async (req, res) => {
  try {
    const { month, category, type } = req.query;

    const filter = { user: req.userId };

    if (type) filter.type = type;

    if (month) {
      const range = getMonthRange(month);
      if (!range) return res.status(400).json({ message: 'Invalid month format. Use "YYYY-MM".' });

      filter.date = { $gte: range.start, $lt: range.end };
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category id." });
      }
      filter.category = category;
    }

    const transactions = await Transaction.find(filter)
      .populate("category", "name color")
      .sort({ date: -1, createdAt: -1 });

    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const { amount, description, category, date, type } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "Amount is required." });
    }
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    if (!date) {
      return res.status(400).json({ message: "Date is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category id." });
    }

    // Ensure the category belongs to the logged-in user
    const cat = await Category.findOne({ _id: category, user: req.userId });
    if (!cat) return res.status(404).json({ message: "Category not found." });

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: "Invalid date." });
    }

    const created = await Transaction.create({
      user: req.userId,
      type: type || "expense",
      amount: Number(amount),
      description: description?.trim() || "",
      category,
      date: d
    });

    const populated = await Transaction.findById(created._id).populate("category", "name color");

    res.status(201).json({ transaction: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/transactions/:id
router.patch("/:id", async (req, res) => {
  try {
    const { amount, description, category, date, type } = req.body;

    const update = {};

    if (amount !== undefined) update.amount = Number(amount);
    if (description !== undefined) update.description = description.trim();
    if (type !== undefined) update.type = type;

    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid date." });
      }
      update.date = d;
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category id." });
      }
      const cat = await Category.findOne({ _id: category, user: req.userId });
      if (!cat) return res.status(404).json({ message: "Category not found." });
      update.category = category;
    }

    const updated = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      update,
      { new: true, runValidators: true }
    ).populate("category", "name color");

    if (!updated) return res.status(404).json({ message: "Transaction not found." });

    res.json({ transaction: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: "Transaction not found." });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
