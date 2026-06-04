import { Expense } from "../models/Expense.js";
import cloudinary from "../utils/cloudinary.js";
import { Readable } from "stream";

// ── POST /api/v1/expenses ──────────────────────────────────────────────────────
export const createExpense = async (req, res) => {
  try {
    const { title, description, amount, category, paymentMethod, date, vendor, notes } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({ success: false, message: "title, amount, and category are required" });
    }

    let receiptUrl = "";
    let receiptPublicId = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      receiptUrl = result.secure_url;
      receiptPublicId = result.public_id;
    }

    const expense = await Expense.create({
      title,
      description,
      amount: Number(amount),
      category,
      paymentMethod: paymentMethod || "cash",
      date: date ? new Date(date) : new Date(),
      vendor,
      notes,
      receiptUrl,
      receiptPublicId,
      createdBy: req.user._id,
    });

    const populated = await expense.populate("category", "name color icon");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error("createExpense error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/expenses ───────────────────────────────────────────────────────
export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate("category", "name color icon")
      .sort({ date: -1 });

    return res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/expenses/:id ───────────────────────────────────────────────────
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate("category", "name color icon");
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/expenses/:id ───────────────────────────────────────────────────
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    const { title, description, amount, category, paymentMethod, date, vendor, notes } = req.body;

    let receiptUrl = expense.receiptUrl;
    let receiptPublicId = expense.receiptPublicId;

    if (req.file) {
      // Delete old receipt from Cloudinary if it exists
      if (expense.receiptPublicId) {
        try {
          await cloudinary.uploader.destroy(expense.receiptPublicId, { resource_type: "image" });
        } catch (_) {}
      }
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      receiptUrl = result.secure_url;
      receiptPublicId = result.public_id;
    }

    Object.assign(expense, {
      title:         title         ?? expense.title,
      description:   description   ?? expense.description,
      amount:        amount        !== undefined ? Number(amount) : expense.amount,
      category:      category      ?? expense.category,
      paymentMethod: paymentMethod ?? expense.paymentMethod,
      date:          date          ? new Date(date) : expense.date,
      vendor:        vendor        ?? expense.vendor,
      notes:         notes         ?? expense.notes,
      receiptUrl,
      receiptPublicId,
    });

    await expense.save();
    await expense.populate("category", "name color icon");

    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    console.error("updateExpense error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/expenses/:id ────────────────────────────────────────────────
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    if (expense.receiptPublicId) {
      try {
        await cloudinary.uploader.destroy(expense.receiptPublicId, { resource_type: "image" });
      } catch (_) {}
    }

    await expense.deleteOne();
    return res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/expenses/summary ──────────────────────────────────────────────
// Returns total grouped by period and category — used by Reports page
export const getExpenseSummary = async (req, res) => {
  try {
    const expenses = await Expense.find().populate("category", "name color");

    const summary = {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      byCategory: {},
    };

    expenses.forEach(e => {
      const catName = e.category?.name || "Uncategorised";
      if (!summary.byCategory[catName]) {
        summary.byCategory[catName] = { total: 0, color: e.category?.color || "#6366f1", count: 0 };
      }
      summary.byCategory[catName].total += e.amount;
      summary.byCategory[catName].count += 1;
    });

    return res.status(200).json({ success: true, data: summary, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────────
async function uploadToCloudinary(buffer, originalName) {
  const safeName = (originalName || `receipt-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "-");
  const publicId = `wfc-expenses/${Date.now()}-${safeName}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", public_id: publicId },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}
