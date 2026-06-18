import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

export async function getCategories(req, res) {
  try {
    const categories = await Category.find({ user: req.userId }).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const created = await Category.create({
      user: req.userId,
      name: name.trim(),
      color: color?.trim() || undefined
    });

    res.status(201).json({ category: created });
  } catch (err) {
    // duplicate key (same user + same name)
    if (err.code === 11000) {
      return res.status(409).json({ message: "Category already exists." });
    }
    res.status(500).json({ message: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { name, color } = req.body;

    const updated = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(color !== undefined ? { color: color.trim() } : {})
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Category not found." });

    res.json({ category: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Category already exists." });
    }
    res.status(500).json({ message: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const used = await Transaction.findOne({
      user: req.userId,
      category: req.params.id
    });

    if (used) {
      return res.status(400).json({
        message: "Cannot delete category because it is used by existing transactions."
      });
    }

    const deleted = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
