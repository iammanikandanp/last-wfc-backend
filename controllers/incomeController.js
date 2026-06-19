import { Income } from "../models/Income.js";

// ── POST /api/v1/incomes ──────────────────────────────────────────────────────
export const createIncome = async (req, res) => {
  try {
    const { title, description, amount, category, type, paymentMethod, date, notes } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({ success: false, message: "title, amount, and category are required" });
    }

    const income = await Income.create({
      title,
      description,
      amount: Number(amount),
      category,
      type: type || "income",
      paymentMethod: paymentMethod || "cash",
      date: date ? new Date(date) : new Date(),
      notes,
      createdBy: req.user._id,
    });

    const populated = await income.populate("category", "name color");
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/incomes ───────────────────────────────────────────────────────
export const getAllIncomes = async (req, res) => {
  try {
    const incomes = await Income.find()
      .populate("category", "name color")
      .sort({ date: -1 });
    return res.status(200).json({ success: true, data: incomes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/incomes/:id ───────────────────────────────────────────────────
export const getIncomeById = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id).populate("category", "name color");
    if (!income) return res.status(404).json({ success: false, message: "Income not found" });
    return res.status(200).json({ success: true, data: income });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/incomes/:id ───────────────────────────────────────────────────
export const updateIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ success: false, message: "Income not found" });

    const { title, description, amount, category, type, paymentMethod, date, notes } = req.body;

    Object.assign(income, {
      title:         title         ?? income.title,
      description:   description   ?? income.description,
      amount:        amount        !== undefined ? Number(amount) : income.amount,
      category:      category      ?? income.category,
      type:          type          ?? income.type,
      paymentMethod: paymentMethod ?? income.paymentMethod,
      date:          date          ? new Date(date) : income.date,
      notes:         notes         ?? income.notes,
    });

    await income.save();
    await income.populate("category", "name color");
    return res.status(200).json({ success: true, data: income });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/incomes/:id ────────────────────────────────────────────────
export const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ success: false, message: "Income not found" });

    await income.deleteOne();
    return res.status(200).json({ success: true, message: "Income deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
