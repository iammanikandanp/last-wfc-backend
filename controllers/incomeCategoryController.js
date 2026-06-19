import { IncomeCategory } from "../models/IncomeCategory.js";

// ── POST /api/v1/income-categories ───────────────────────────────────────────
export const createIncomeCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const exists = await IncomeCategory.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ success: false, message: "Category already exists" });

    const category = await IncomeCategory.create({
      name: name.trim(),
      description,
      color: color || "#10b981",
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/income-categories ────────────────────────────────────────────
export const getAllIncomeCategories = async (req, res) => {
  try {
    const cats = await IncomeCategory.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ success: true, data: cats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/income-categories/:id ────────────────────────────────────────
export const updateIncomeCategory = async (req, res) => {
  try {
    const cat = await IncomeCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    const { name, description, color } = req.body;
    if (name) cat.name = name.trim();
    if (description !== undefined) cat.description = description;
    if (color) cat.color = color;

    await cat.save();
    return res.status(200).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/income-categories/:id ─────────────────────────────────────
export const deleteIncomeCategory = async (req, res) => {
  try {
    const cat = await IncomeCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    cat.isActive = false;
    await cat.save();
    return res.status(200).json({ success: true, message: "Category removed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
