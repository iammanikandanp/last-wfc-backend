import { CafeteriaStock } from "../models/CafeteriaStock.js";
import { CafeteriaTransaction } from "../models/CafeteriaTransaction.js";
import { Registration } from "../models/registration.js";

const isMemberActive = (member) => {
  if (!member?.endDate) return false;
  const diffDays = Math.ceil((new Date(member.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays > 7;
};

const fmtError = (res, err) => res.status(500).json({ success: false, message: err.message || "Server error" });

export const getMemberBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await CafeteriaTransaction.find({ member: id });
    const balance = transactions.reduce((sum, t) => sum + (t.paidAmount || 0) - (t.totalAmount || 0), 0);
    return res.status(200).json({ success: true, balance });
  } catch (err) {
    return fmtError(res, err);
  }
};
export const getTransactions = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status === "Paid") filter.paymentStatus = "Paid";
    if (status === "Unpaid") filter.paymentStatus = "Unpaid";
    if (status === "Extra") filter.extraAmount = { $gt: 0 };
    const records = await CafeteriaTransaction.find(filter)
      .populate("member", "name phone")
      .populate("item", "itemName price")
      .sort({ transactionDate: -1 });
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    return fmtError(res, err);
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { memberId, itemId, quantity, paidAmount = 0, settlePreviousBalance } = req.body;
    const qty = Number(quantity);
    let paidNum = Number(paidAmount); // Amount actually paid in cash/card right now

    if (!memberId || !itemId) return res.status(400).json({ success: false, message: "Member and item are required" });
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    if (Number.isNaN(paidNum) || paidNum < 0) return res.status(400).json({ success: false, message: "Paid amount must be valid" });

    const [member, item] = await Promise.all([
      Registration.findById(memberId),
      CafeteriaStock.findById(itemId),
    ]);

    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    if (!isMemberActive(member)) return res.status(400).json({ success: false, message: "Member is not active" });
    if (qty > item.quantity) return res.status(400).json({ success: false, message: `Only ${item.quantity} ${item.unit || 'units'} of ${item.itemName} available in stock` });

    const totalAmount = Number(item.costPerUnit || 0) * qty; // actual item cost
    
    // Find past credit if settlePreviousBalance is true
    let availableCredit = 0;
    let allPastTx = [];
    if (settlePreviousBalance) {
      allPastTx = await CafeteriaTransaction.find({ member: member._id }).sort({ transactionDate: 1 });
      // Total paid historically minus total cost historically
      let historicalPaid = 0;
      let historicalCost = 0;
      allPastTx.forEach(t => {
        historicalPaid += (t.paidAmount || 0);
        historicalCost += (t.totalAmount || 0);
      });
      availableCredit = Math.max(0, historicalPaid - historicalCost);
    }

    // Apply available credit to this transaction's paidAmount
    let creditUsed = 0;
    if (availableCredit > 0) {
      creditUsed = Math.min(availableCredit, Math.max(0, totalAmount - paidNum));
      paidNum += creditUsed;
    }

    const extraAmount = Math.max(0, paidNum - totalAmount);
    const status = paidNum >= totalAmount ? "Paid" : "Unpaid";

    const transaction = await CafeteriaTransaction.create({
      member: member._id,
      memberName: member.name || "Unknown",
      item: item._id,
      itemName: item.itemName,
      quantity: qty,
      itemAmount: totalAmount,
      extraAmount,
      paidAmount: paidNum,
      totalAmount,
      paymentStatus: status,
      transactionDate: new Date(),
      recordedBy: req.user._id,
    });

    item.quantity -= qty;
    await item.save();

    // If there is excess payment and they want to settle previous unpaid transactions
    if (settlePreviousBalance && extraAmount > 0) {
      let remainingToSettle = extraAmount;
      
      for (const t of allPastTx) {
        if (remainingToSettle <= 0) break;
        if (t.paymentStatus === "Unpaid" && t._id.toString() !== transaction._id.toString()) {
          const balanceDue = Math.max(0, t.totalAmount - t.paidAmount);
          if (balanceDue > 0) {
            const amountToApply = Math.min(balanceDue, remainingToSettle);
            t.paidAmount += amountToApply;
            remainingToSettle -= amountToApply;
            
            // Recalculate status and extra
            t.extraAmount = Math.max(0, t.paidAmount - t.totalAmount);
            if (t.paidAmount >= t.totalAmount) {
              t.paymentStatus = "Paid";
            }
            await t.save();
          }
        }
      }
      
      // We do NOT subtract from the new transaction's paidAmount because that represents the overall pool of money received today
      // The total netBalance will correctly resolve because the new transaction has extraAmount, which counteracts the increased paidAmount of old txs.
      // Wait, if we increase t.paidAmount, the global sum(paidAmount) increases, which creates money out of nowhere!
      // ACCOUNTING FIX: If we distribute the extra money from the current transaction to old ones, we MUST subtract it from the current transaction's paidAmount!
      
      if (extraAmount - remainingToSettle > 0) {
          const amountDistributed = extraAmount - remainingToSettle;
          transaction.paidAmount -= amountDistributed;
          transaction.extraAmount = Math.max(0, transaction.paidAmount - transaction.totalAmount);
          if (transaction.paidAmount >= transaction.totalAmount) {
             transaction.paymentStatus = "Paid";
          } else {
             transaction.paymentStatus = "Unpaid"; // Should never happen since we only distribute extra
          }
          await transaction.save();
      }
    }

    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    return fmtError(res, err);
  }
};

export const payCafeteriaBalance = async (req, res) => {
  try {
    const { id: memberId } = req.params;
    const { amount } = req.body;
    let paymentAmount = Number(amount);

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    const allTx = await CafeteriaTransaction.find({ member: memberId, paymentStatus: "Unpaid" }).sort({ transactionDate: 1 });
    
    if (allTx.length === 0) {
      return res.status(400).json({ success: false, message: "No unpaid transactions found for this member" });
    }

    for (const t of allTx) {
      if (paymentAmount <= 0) break;
      
      const balanceDue = Math.max(0, t.totalAmount - t.paidAmount);
      if (balanceDue > 0) {
        const applyAmount = Math.min(balanceDue, paymentAmount);
        t.paidAmount += applyAmount;
        paymentAmount -= applyAmount;
        
        t.extraAmount = Math.max(0, t.paidAmount - t.totalAmount);
        if (t.paidAmount >= t.totalAmount) {
          t.paymentStatus = "Paid";
        }
        await t.save();
      }
    }

    // If there is STILL leftover payment amount, we need to apply it to the MOST RECENT transaction to generate Extra Credit
    if (paymentAmount > 0) {
      const mostRecentTx = await CafeteriaTransaction.findOne({ member: memberId }).sort({ transactionDate: -1 });
      if (mostRecentTx) {
        mostRecentTx.paidAmount += paymentAmount;
        mostRecentTx.extraAmount = Math.max(0, mostRecentTx.paidAmount - mostRecentTx.totalAmount);
        mostRecentTx.paymentStatus = "Paid";
        await mostRecentTx.save();
      }
    }

    return res.status(200).json({ success: true, message: "Payment applied successfully" });
  } catch (err) {
    return fmtError(res, err);
  }
};


export const getDashboard = async (req, res) => {
  try {
    const [items, transactions] = await Promise.all([
      CafeteriaStock.find().sort({ itemName: 1 }),
      CafeteriaTransaction.find().sort({ transactionDate: -1 }),
    ]);

    const summary = {
      totalTransactions: transactions.length,
      paidCount: transactions.filter(t => t.paymentStatus === "Paid").length,
      unpaidCount: transactions.filter(t => t.paymentStatus === "Unpaid").length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      totalCollected: transactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0),
      totalPending: transactions.reduce((sum, t) => sum + Math.max(0, (t.totalAmount || 0) - (t.paidAmount || 0)), 0),
      totalExtraAmount: transactions.reduce((sum, t) => sum + (t.extraAmount || 0), 0),
      paidVsUnpaid: [
        { label: "Paid", value: transactions.filter(t => t.paymentStatus === "Paid").length },
        { label: "Unpaid", value: transactions.filter(t => t.paymentStatus === "Unpaid").length },
      ],
      itemConsumption: [],
      itemRevenue: [],
      extraCollected: [],
      dailyRevenue: [],
    };

    const consumptionByItem = {};
    const revenueByItem = {};
    const extraByItem = {};
    const dailyMap = {};

    transactions.forEach((t) => {
      consumptionByItem[t.itemName] = (consumptionByItem[t.itemName] || 0) + (t.quantity || 0);
      revenueByItem[t.itemName] = (revenueByItem[t.itemName] || 0) + (t.itemAmount || 0);
      extraByItem[t.itemName] = (extraByItem[t.itemName] || 0) + (t.extraAmount || 0);
      const day = new Date(t.transactionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      dailyMap[day] = (dailyMap[day] || 0) + (t.totalAmount || 0);
    });

    summary.itemConsumption = Object.entries(consumptionByItem).map(([itemName, value]) => ({ itemName, value }));
    summary.itemRevenue = Object.entries(revenueByItem).map(([itemName, value]) => ({ itemName, value }));
    summary.extraCollected = Object.entries(extraByItem).map(([itemName, value]) => ({ itemName, value }));
    summary.dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ success: true, data: { items, transactions, summary } });
  } catch (err) {
    return fmtError(res, err);
  }
};
