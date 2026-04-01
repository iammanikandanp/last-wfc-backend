import { Payment } from "../models/Payment.js";
import { Invoice } from "../models/Invoice.js";
import { Member } from "../models/Member.js";
import { Plan } from "../models/Plan.js";
import { generateInvoiceNumber } from "../utils/helpers.js";

// Create payment
export const createPayment = async (req, res) => {
  try {
    const { memberId, planId, amount, paymentMode, description } = req.body;

    if (!memberId || !planId || !amount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const member = await Member.findById(memberId);
    const plan = await Plan.findById(planId);

    if (!member || !plan) {
      return res.status(404).json({
        success: false,
        message: "Member or Plan not found",
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    const durationInDays = plan.duration;
    endDate.setDate(endDate.getDate() + durationInDays);

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    const payment = new Payment({
      memberId,
      planId,
      amount,
      paymentMode,
      description,
      paymentStatus: "completed",
      transactionId: `TXN-${Date.now()}`,
      invoiceNumber,
      startDate,
      endDate,
    });

    await payment.save();

    // Update member
    member.currentPlan = planId;
    member.startDate = startDate;
    member.expiryDate = endDate;
    member.status = "active";
    member.totalPaid += amount;
    member.pendingAmount = Math.max(0, member.pendingAmount - amount);

    await member.save();

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      memberId,
      paymentId: payment._id,
      memberName: member.userId || "",
      amount,
      paymentMode,
      paymentDate: startDate,
      startDate,
      endDate,
      planName: plan.name,
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      payment,
      invoiceNumber,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all payments
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("memberId", "userId")
      .populate("planId", "name price duration")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get payments by member
export const getPaymentsByMember = async (req, res) => {
  try {
    const payments = await Payment.find({ memberId: req.params.memberId })
      .populate("planId", "name price duration")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get payment details
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("memberId")
      .populate("planId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get revenue summary
export const getRevenueSummary = async (req, res) => {
  try {
    const completedPayments = await Payment.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
          avgPayment: { $avg: "$amount" },
        },
      },
    ]);

    const paymentsByMode = await Payment.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: "$paymentMode",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly revenue
    const monthlyRevenue = await Payment.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      success: true,
      summary: {
        overall: completedPayments[0] || { totalRevenue: 0, totalPayments: 0 },
        byMode: paymentsByMode,
        monthly: monthlyRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
