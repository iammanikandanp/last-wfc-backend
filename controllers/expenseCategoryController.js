import { ExpenseCategory } from "../models/ExpenseCategory.js";

// ── POST /api/v1/expense-categories ───────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const exists = await ExpenseCategory.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ success: false, message: "Category already exists" });

    const category = await ExpenseCategory.create({
      name: name.trim(),
      description,
      color: color || "#6366f1",
      icon:  icon  || "tag",
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/expense-categories ────────────────────────────────────────────
export const getAllCategories = async (req, res) => {
  try {
    const cats = await ExpenseCategory.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ success: true, data: cats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/expense-categories/:id ────────────────────────────────────────
export const updateCategory = async (req, res) => {
  try {
    const cat = await ExpenseCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    const { name, description, color, icon } = req.body;
    if (name) cat.name = name.trim();
    if (description !== undefined) cat.description = description;
    if (color) cat.color = color;
    if (icon) cat.icon = icon;

    await cat.save();
    return res.status(200).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/expense-categories/:id ─────────────────────────────────────
export const deleteCategory = async (req, res) => {
  try {
    const cat = await ExpenseCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    // Soft-delete: just mark inactive
    cat.isActive = false;
    await cat.save();
    return res.status(200).json({ success: true, message: "Category removed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
