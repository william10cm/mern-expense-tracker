import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(requireAuth);

// Parse "YYYY-MM" into start/end dates (UTC)
function getMonthRange(monthStr) {
  const [y, m] = (monthStr || "").split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // next month start
  return { start, end };
}

function monthOr400(req, res) {
  const month = (req.query.month || "").trim();
  const range = getMonthRange(month);
  if (!range) {
    res.status(400).json({ message: 'Invalid month format. Use "YYYY-MM".' });
    return null;
  }
  return { ...range, month };
}

// GET /api/reports/summary?month=YYYY-MM
router.get("/summary", async (req, res) => {
  try {
    const data = monthOr400(req, res);
    if (!data) return;

    const { start, end, month } = data;

    const match = {
      user: new mongoose.Types.ObjectId(req.userId),
      date: { $gte: start, $lt: end }
    };

    const grouped = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const expense = grouped.find((g) => g._id === "expense") || { total: 0, count: 0 };
    const income = grouped.find((g) => g._id === "income") || { total: 0, count: 0 };

    res.json({
      month,
      totalExpense: expense.total,
      totalIncome: income.total,
      net: income.total - expense.total,
      count: expense.count + income.count
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/by-category?month=YYYY-MM&type=expense
router.get("/by-category", async (req, res) => {
  try {
    const data = monthOr400(req, res);
    if (!data) return;

    const { start, end, month } = data;

    const type = req.query.type || "expense";

    const match = {
      user: new mongoose.Types.ObjectId(req.userId),
      type,
      date: { $gte: start, $lt: end }
    };

    const rows = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          categoryId: "$category._id",
          name: "$category.name",
          color: "$category.color",
          total: 1
        }
      }
    ]);

    res.json({ month, type, rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/trend?month=YYYY-MM&type=expense
router.get("/trend", async (req, res) => {
  try {
    const data = monthOr400(req, res);
    if (!data) return;

    const { start, end, month } = data;

    const type = req.query.type || "expense";

    const match = {
      user: new mongoose.Types.ObjectId(req.userId),
      type,
      date: { $gte: start, $lt: end }
    };

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", total: 1 } }
    ]);

    res.json({ month, type, rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
