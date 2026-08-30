import { CafeteriaStock } from "../models/CafeteriaStock.js";
import { CafeteriaStockRefill } from "../models/CafeteriaStockRefill.js";
import { CafeteriaConsumption } from "../models/CafeteriaConsumption.js";
import { Registration } from "../models/registration.js";

// A member counts as "active" the same way the Members page does:
// not expired, and not within 7 days of expiry.
const isMemberActive = (endDate) => {
  if (!endDate) return false;
  const diffDays = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays > 7;
};

// ── GET /api/v1/cafeteria/stock ────────────────────────────────────────────────
export const getAllStock = async (req, res) => {
  try {
    const stock = await CafeteriaStock.find().sort({ itemName: 1 });
    return res.status(200).json({ success: true, data: stock });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/cafeteria/stock ───────────────────────────────────────────────
export const createStockItem = async (req, res) => {
  try {
    const { itemName, unit, quantity, lowStockThreshold, costPerUnit } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ success: false, message: "Item name is required" });
    }

    const exists = await CafeteriaStock.findOne({ itemName: itemName.trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: "An item with this name already exists" });
    }

    const qty  = quantity !== undefined ? Number(quantity) : 0;
    const cost = costPerUnit !== undefined ? Number(costPerUnit) : 0;

    const item = await CafeteriaStock.create({
      itemName: itemName.trim(),
      unit: unit?.trim() || "pcs",
      quantity: qty,
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5,
      costPerUnit: cost,
      createdBy: req.user._id,
    });

    // Capture the initial stock as a ledger entry so it counts toward investment.
    if (qty > 0) {
      await CafeteriaStockRefill.create({
        stock: item._id,
        itemName: item.itemName,
        quantity: qty,
        unitCost: cost,
        totalCost: qty * cost,
        source: "initial",
        refilledBy: req.user._id,
      });
    }

    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/cafeteria/stock/:id ────────────────────────────────────────────
// Manual edit — name / unit / threshold, and an optional direct quantity
// correction. Does NOT write a refill history row (use /refill for that).
export const updateStockItem = async (req, res) => {
  try {
    const item = await CafeteriaStock.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Stock item not found" });

    const { itemName, unit, lowStockThreshold, quantity, costPerUnit } = req.body;

    if (itemName && itemName.trim() && itemName.trim() !== item.itemName) {
      const dup = await CafeteriaStock.findOne({ itemName: itemName.trim(), _id: { $ne: item._id } });
      if (dup) return res.status(400).json({ success: false, message: "An item with this name already exists" });
      item.itemName = itemName.trim();
    }

    if (unit !== undefined) item.unit = unit.trim() || item.unit;
    if (lowStockThreshold !== undefined) item.lowStockThreshold = Number(lowStockThreshold);
    if (quantity !== undefined) item.quantity = Math.max(0, Number(quantity));
    if (costPerUnit !== undefined) item.costPerUnit = Math.max(0, Number(costPerUnit));

    await item.save();
    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/cafeteria/stock/:id/refill ────────────────────────────────────
export const refillStock = async (req, res) => {
  try {
    const { quantity, unitCost } = req.body;
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Refill quantity must be greater than 0" });
    }

    const item = await CafeteriaStock.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Stock item not found" });

    const cost = unitCost !== undefined && unitCost !== "" ? Number(unitCost) : item.costPerUnit;

    item.quantity += qty;
    if (unitCost !== undefined && unitCost !== "") item.costPerUnit = cost; // keep the item's current price up to date
    await item.save();

    const refill = await CafeteriaStockRefill.create({
      stock: item._id,
      itemName: item.itemName,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      source: "refill",
      refilledBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: { stock: item, refill } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/cafeteria/stock/refill-history ─────────────────────────────────
export const getRefillHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.query.stockId) filter.stock = req.query.stockId;

    const history = await CafeteriaStockRefill.find(filter)
      .populate("refilledBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/cafeteria/consumption?date=YYYY-MM-DD ──────────────────────────
export const getConsumptionByDate = async (req, res) => {
  try {
    const day = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(day.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);

    const records = await CafeteriaConsumption.find({ createdAt: { $gte: start, $lte: end } })
      .populate("stock", "itemName unit")
      .populate("member", "name phone")
      .populate("recordedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/cafeteria/consumption ─────────────────────────────────────────
export const createConsumption = async (req, res) => {
  try {
    const { stockId, memberId, quantity, amount, paidAmount, paymentStatus, paymentDate } = req.body;
    const qty = Number(quantity);

    if (!stockId || !memberId) {
      return res.status(400).json({ success: false, message: "Item and member are required" });
    }
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    }

    const [item, member] = await Promise.all([
      CafeteriaStock.findById(stockId),
      Registration.findById(memberId),
    ]);

    if (!item) return res.status(404).json({ success: false, message: "Stock item not found" });
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    if (!isMemberActive(member.endDate)) {
      return res.status(400).json({ success: false, message: "Selected member is not an active member" });
    }

    if (qty > item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock available — only ${item.quantity} ${item.unit} of ${item.itemName} left`,
      });
    }

    item.quantity -= qty;
    await item.save();

    const recordAmount = Number(item.costPerUnit || 0) * qty;
    const status = paymentStatus === "Paid" ? "Paid" : "Unpaid";
    const resolvedPaidAmount = status === "Paid"
      ? (paidAmount !== undefined && paidAmount !== null ? Number(paidAmount) : recordAmount)
      : 0;
    const resolvedPaymentDate = paymentDate ? new Date(paymentDate) : (status === "Paid" ? new Date() : undefined);

    const record = await CafeteriaConsumption.create({
      stock: item._id,
      itemName: item.itemName,
      member: member._id,
      memberName: member.name,
      quantity: qty,
      amount: recordAmount,
      paidAmount: resolvedPaidAmount,
      paymentStatus: status,
      paymentDate: resolvedPaymentDate,
      recordedBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: { consumption: record, stock: item } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/cafeteria/dashboard ─────────────────────────────────────────────
// Single aggregation for the always-visible dashboard: stock summary,
// financial KPIs, and consumption analytics — all computed from the DB.
export const getCafeteriaDashboard = async (req, res) => {
  try {
    const [stock, refills, consumption] = await Promise.all([
      CafeteriaStock.find().sort({ itemName: 1 }),
      CafeteriaStockRefill.find(),
      CafeteriaConsumption.find().populate("member", "name").sort({ createdAt: -1 }),
    ]);

    const totalInvestment = refills.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalRevenue = consumption
      .filter(c => c.paymentStatus === "Paid")
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const totalPending = consumption
      .filter(c => c.paymentStatus !== "Paid")
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const netProfitLoss = totalRevenue - totalInvestment;

    // ── Per-member totals ──
    const memberTotals = {};
    consumption.forEach(c => {
      const key = c.member?._id?.toString() || c.memberName;
      if (!memberTotals[key]) {
        memberTotals[key] = { memberId: key, name: c.member?.name || c.memberName, quantity: 0, amount: 0 };
      }
      memberTotals[key].quantity += c.quantity;
      memberTotals[key].amount += c.amount || 0;
    });
    const topMembers = Object.values(memberTotals).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // ── Per-item consumption totals ──
    const itemTotals = {};
    consumption.forEach(c => {
      itemTotals[c.itemName] = (itemTotals[c.itemName] || 0) + c.quantity;
    });
    const itemEntries = Object.entries(itemTotals).map(([itemName, quantity]) => ({ itemName, quantity }));
    const sortedByQty = [...itemEntries].sort((a, b) => b.quantity - a.quantity);
    const mostConsumedItem = sortedByQty[0] || null;
    const leastConsumedItem = sortedByQty.length ? sortedByQty[sortedByQty.length - 1] : null;

    const recentConsumption = consumption.slice(0, 8);
    const lowStockItems = stock.filter(s => s.quantity <= s.lowStockThreshold);

    return res.status(200).json({
      success: true,
      data: {
        stock,
        totalInvestment,
        totalRevenue,
        totalPaid: totalRevenue,
        totalPending,
        netProfitLoss,
        topMembers,
        mostConsumedItem,
        leastConsumedItem,
        recentConsumption,
        lowStockItems,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
