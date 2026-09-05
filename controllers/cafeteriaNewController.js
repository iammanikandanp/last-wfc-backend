import { CafeteriaStock } from "../models/CafeteriaStock.js";
import { CafeteriaTransaction } from "../models/CafeteriaTransaction.js";
import { CafeteriaPayment } from "../models/CafeteriaPayment.js";
import { Registration } from "../models/registration.js";

const isMemberActive = (member) => {
  if (!member?.endDate) return false;
  const diffDays = Math.ceil((new Date(member.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return member.status !== "blocked" && diffDays > 0;
};

const fmtError = (res, err) => res.status(500).json({ success: false, message: err.message || "Server error" });

export const getMemberBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await CafeteriaTransaction.find({ member: id }).sort({ transactionDate: -1 });
    const balance = transactions.reduce((sum, t) => sum + (t.paidAmount || 0) - (t.previousBalanceUsed || 0) - (t.totalAmount || 0), 0);
    return res.status(200).json({ success: true, balance, transactions });
  } catch (err) {
    return fmtError(res, err);
  }
};
export const getTransactions = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) {
      if (status === "Admin") {
        filter.transactionType = "admin";
      } else {
        filter.transactionType = { $ne: "admin" };
        if (status === "Paid") filter.paymentStatus = "Paid";
        if (status === "Unpaid") filter.paymentStatus = "Unpaid";
        if (status === "Extra") filter.extraAmount = { $gt: 0 };
      }
    }
    const records = await CafeteriaTransaction.find(filter)
      .populate("member", "name phone images.profileImage")
      .populate("item", "itemName price")
      .sort({ transactionDate: -1 });
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    return fmtError(res, err);
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { memberId, items = [], paidAmount = 0, paymentMode, transactionType = "member" } = req.body;

    if (transactionType === "admin") {
      if (items.length === 0) return res.status(400).json({ success: false, message: "Items are required" });

      const processedItems = [];
      for (const reqItem of items) {
        const qty = Number(reqItem.quantity);
        if (!qty || qty <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });

        const stockItem = await CafeteriaStock.findById(reqItem.itemId);
        if (!stockItem) return res.status(404).json({ success: false, message: `Item not found` });
        
        if (qty > stockItem.quantity) {
          return res.status(400).json({ success: false, message: `Only ${stockItem.quantity} ${stockItem.unit || 'units'} of ${stockItem.itemName} available in stock` });
        }

        const itemCost = Number(stockItem.costPerUnit || 0) * qty;

        processedItems.push({
          itemId: stockItem._id,
          itemName: stockItem.itemName,
          quantity: qty,
          amount: itemCost
        });

        // Deduct stock
        stockItem.quantity -= qty;
        await stockItem.save();
      }

      const transaction = await CafeteriaTransaction.create({
        transactionType: "admin",
        items: processedItems,
        item: processedItems.length > 0 ? processedItems[0].itemId : undefined,
        itemName: processedItems.length > 0 ? processedItems[0].itemName : undefined,
        quantity: processedItems.length > 0 ? processedItems[0].quantity : undefined,
        itemAmount: processedItems.length > 0 ? processedItems[0].amount : undefined,
        totalAmount: 0,
        paidAmount: 0,
        extraAmount: 0,
        paymentStatus: "Admin",
        transactionDate: new Date(),
        recordedBy: req.user._id,
      });

      return res.status(201).json({ success: true, transaction });
    }

    let paidNum = Number(paidAmount);

    if (!memberId || items.length === 0) return res.status(400).json({ success: false, message: "Member and items are required" });
    if (Number.isNaN(paidNum) || paidNum < 0) return res.status(400).json({ success: false, message: "Paid amount must be valid" });
    if (paidNum > 0 && !["Cash", "GPay"].includes(paymentMode)) return res.status(400).json({ success: false, message: "Valid payment mode (Cash, GPay) is required when paying an amount" });

    const member = await Registration.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    if (!isMemberActive(member)) return res.status(400).json({ success: false, message: "Member is not active" });

    let globalTotalAmount = 0;
    const processedItems = [];

    // Loop through requested items and deduct stock
    for (const reqItem of items) {
      const qty = Number(reqItem.quantity);
      if (!qty || qty <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });

      const stockItem = await CafeteriaStock.findById(reqItem.itemId);
      if (!stockItem) return res.status(404).json({ success: false, message: `Item ${reqItem.itemId} not found` });
      
      if (qty > stockItem.quantity) {
        return res.status(400).json({ success: false, message: `Only ${stockItem.quantity} ${stockItem.unit || 'units'} of ${stockItem.itemName} available in stock` });
      }

      const itemCost = Number(stockItem.costPerUnit || 0) * qty;
      globalTotalAmount += itemCost;

      processedItems.push({
        itemId: stockItem._id,
        itemName: stockItem.itemName,
        quantity: qty,
        amount: itemCost
      });

      // Deduct stock
      stockItem.quantity -= qty;
      await stockItem.save();
    }
    
    const previousBalance = (await CafeteriaTransaction.find({ member: member._id }))
      .reduce((sum, t) => sum + (t.paidAmount || 0) - (t.previousBalanceUsed || 0) - (t.totalAmount || 0), 0);
      
    const positiveBalance = Math.max(0, previousBalance);
    let balanceConsumed = 0;
    if (globalTotalAmount > paidNum) {
      balanceConsumed = Math.min(positiveBalance, globalTotalAmount - paidNum);
    }
    
    let totalPaidForThisTx = balanceConsumed + paidNum;
    let remainingForThisTx = Math.max(0, globalTotalAmount - totalPaidForThisTx);
    let status = remainingForThisTx === 0 ? "Paid" : "Unpaid";
    let extraAmount = Math.max(0, totalPaidForThisTx - globalTotalAmount);

    const resultingBalance = previousBalance + paidNum - globalTotalAmount;

    const transaction = await CafeteriaTransaction.create({
      member: member._id,
      memberName: member.name || "Unknown",
      items: processedItems,
      // Provide legacy fields as fallback (using the first item if available) just in case
      item: processedItems.length > 0 ? processedItems[0].itemId : undefined,
      itemName: processedItems.length > 0 ? processedItems[0].itemName : undefined,
      quantity: processedItems.length > 0 ? processedItems[0].quantity : undefined,
      itemAmount: processedItems.length > 0 ? processedItems[0].amount : undefined,
      extraAmount,
      previousBalanceUsed: balanceConsumed,
      newPaymentAmount: paidNum,
      resultingBalance,
      paidAmount: totalPaidForThisTx,
      totalAmount: globalTotalAmount,
      paymentStatus: status,
      paymentMode: paymentMode || "GPay",
      transactionDate: new Date(),
      recordedBy: req.user._id,
    });

    if (paidNum > 0) {
      await CafeteriaPayment.create({
        transactionId: transaction._id,
        amount: paidNum,
        mode: paymentMode,
        date: new Date()
      });
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
        t.newPaymentAmount = (t.newPaymentAmount || 0) + applyAmount;
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
        mostRecentTx.newPaymentAmount = (mostRecentTx.newPaymentAmount || 0) + paymentAmount;
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
      totalCollected: transactions.reduce((sum, t) => sum + (t.paidAmount || 0) - (t.previousBalanceUsed || 0), 0),
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

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await CafeteriaTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });

    // Refund stock to inventory
    if (transaction.items && transaction.items.length > 0) {
      for (const reqItem of transaction.items) {
        const stockItem = await CafeteriaStock.findById(reqItem.itemId);
        if (stockItem) {
          stockItem.quantity += (reqItem.quantity || 0);
          await stockItem.save();
        }
      }
    } else if (transaction.item) {
      // Legacy fallback
      const stockItem = await CafeteriaStock.findById(transaction.item);
      if (stockItem) {
        stockItem.quantity += (transaction.quantity || 0);
        await stockItem.save();
      }
    }

    // Delete associated payments
    await CafeteriaPayment.deleteMany({ transactionId: req.params.id });

    await CafeteriaTransaction.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    return fmtError(res, err);
  }
};

export const deleteAllTransactions = async (req, res) => {
  try {
    const transactions = await CafeteriaTransaction.find();
    
    const stockRefunds = {};
    for (const t of transactions) {
      if (t.items && t.items.length > 0) {
        for (const reqItem of t.items) {
           if (reqItem.itemId) {
              stockRefunds[reqItem.itemId] = (stockRefunds[reqItem.itemId] || 0) + (reqItem.quantity || 0);
           }
        }
      } else if (t.item) {
        stockRefunds[t.item] = (stockRefunds[t.item] || 0) + (t.quantity || 0);
      }
    }

    const bulkOps = Object.keys(stockRefunds).map(itemId => ({
      updateOne: {
        filter: { _id: itemId },
        update: { $inc: { quantity: stockRefunds[itemId] } }
      }
    }));
    if (bulkOps.length > 0) {
      await CafeteriaStock.bulkWrite(bulkOps);
    }

    await CafeteriaPayment.deleteMany({});
    await CafeteriaTransaction.deleteMany({});
    
    return res.status(200).json({ success: true, message: "All transaction history deleted successfully" });
  } catch (err) {
    return fmtError(res, err);
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transaction = await CafeteriaTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });

    const { quantity, additionalPayment, paymentMode } = req.body;
    
    // If updating quantity
    if (quantity !== undefined) {
      let newQty = Number(quantity);
      if (newQty < 0 || Number.isNaN(newQty)) {
        return res.status(400).json({ success: false, message: "Invalid quantity" });
      }

      const stockItem = await CafeteriaStock.findById(transaction.item);
      if (!stockItem) return res.status(404).json({ success: false, message: "Associated stock item not found" });

      const qtyDifference = newQty - transaction.quantity;
      if (qtyDifference > 0 && stockItem.quantity < qtyDifference) {
        return res.status(400).json({ success: false, message: `Only ${stockItem.quantity} ${stockItem.unit || 'units'} available in stock` });
      }

      stockItem.quantity -= qtyDifference;
      await stockItem.save();

      transaction.quantity = newQty;
      transaction.itemAmount = Number(stockItem.costPerUnit || 0) * newQty;
      transaction.totalAmount = transaction.itemAmount;
    }

    // If adding payment
    if (additionalPayment !== undefined) {
      let addedPayment = Number(additionalPayment);
      if (Number.isNaN(addedPayment) || addedPayment < 0) {
         return res.status(400).json({ success: false, message: "Invalid additional payment amount" });
      }
      
      if (addedPayment > 0) {
        if (!["Cash", "GPay"].includes(paymentMode)) {
          return res.status(400).json({ success: false, message: "Valid payment mode (Cash, GPay) is required when paying an amount" });
        }
        
        transaction.paidAmount += addedPayment;
        transaction.newPaymentAmount = (transaction.newPaymentAmount || 0) + addedPayment;
        transaction.paymentMode = paymentMode;

        await CafeteriaPayment.create({
          transactionId: transaction._id,
          amount: addedPayment,
          mode: paymentMode,
          date: new Date()
        });
      }
    }

    // Recalculate status and extra
    transaction.extraAmount = Math.max(0, transaction.paidAmount - transaction.totalAmount);
    transaction.paymentStatus = transaction.paidAmount >= transaction.totalAmount ? "Paid" : "Unpaid";

    await transaction.save();

    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    return fmtError(res, err);
  }
};
