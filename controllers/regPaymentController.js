import { RegPayment } from "../models/RegPayment.js";
import { Registration } from "../models/registration.js";

// ── Create Payment ────────────────────────────────────────────────────────────
export const createRegPayment = async (req, res) => {
  try {
    const {
      registrationId,
      package: pkg,
      amount,
      discount,
      finalAmount,
      paymentMode,
      paymentType,
      advanceAmount,
      balanceAmount,
      startDate,
      endDate,
      invoiceNo,
      pdfUrl,
    } = req.body;

    if (!registrationId || !pkg || !amount || !paymentMode || !invoiceNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: registrationId, package, amount, paymentMode, invoiceNo",
      });
    }

    // Fetch member details from Registration
    const member = await Registration.findById(registrationId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const payment = new RegPayment({
      registrationId,
      memberName:    member.name,
      memberPhone:   member.phone,
      memberEmail:   member.emails,
      package:       pkg,
      amount:        Number(amount),
      discount:      Number(discount) || 0,
      finalAmount:   Number(finalAmount),
      paymentMode,
      paymentType:   paymentType || 'full',
      advanceAmount: Number(advanceAmount) || Number(finalAmount),
      balanceAmount: Number(balanceAmount) || 0,
      paymentStatus: "completed",
      invoiceNo,
      startDate:     startDate ? new Date(startDate) : new Date(),
      endDate:       endDate   ? new Date(endDate)   : null,
      pdfUrl:        pdfUrl || "",
      transactionId: `TXN-${Date.now()}`,
    });

    await payment.save();

    // Also update the member's endDate so membership status stays accurate
    if (endDate) {
      await Registration.findByIdAndUpdate(registrationId, {
        endDate:  new Date(endDate),
        startDate: startDate ? new Date(startDate) : new Date(),
        packages: pkg,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment saved successfully",
      payment,
    });
  } catch (err) {
    console.error("createRegPayment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Payments ──────────────────────────────────────────────────────────
export const getAllRegPayments = async (req, res) => {
  try {
    const payments = await RegPayment.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error("getAllRegPayments error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Payments by Member ────────────────────────────────────────────────────
export const getRegPaymentsByMember = async (req, res) => {
  try {
    const payments = await RegPayment.find({ registrationId: req.params.id })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Revenue Summary ───────────────────────────────────────────────────────────
export const getRevenueSummary = async (req, res) => {
  try {
    const all = await RegPayment.find({ paymentStatus: "completed" });

    const totalRevenue = all.reduce((sum, p) => sum + (p.finalAmount || 0), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = all
      .filter(p => new Date(p.createdAt) >= startOfMonth)
      .reduce((sum, p) => sum + (p.finalAmount || 0), 0);

    const modeBreakdown = { cash: 0, upi: 0, card: 0 };
    all.forEach(p => {
      if (modeBreakdown[p.paymentMode] !== undefined) {
        modeBreakdown[p.paymentMode] += p.finalAmount || 0;
      }
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue,
        monthlyRevenue,
        totalTransactions: all.length,
        modeBreakdown,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Patch PDF URL after Cloudinary upload ─────────────────────────────────────
export const patchPdfUrl = async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    const payment = await RegPayment.findByIdAndUpdate(
      req.params.id,
      { pdfUrl },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Payment ────────────────────────────────────────────────────────────
export const updateRegPayment = async (req, res) => {
  try {
    const payment = await RegPayment.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, message: 'Payment updated', payment });
  } catch (err) {
    console.error('updateRegPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Payment ────────────────────────────────────────────────────────────
export const deleteRegPayment = async (req, res) => {
  try {
    const payment = await RegPayment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, message: 'Payment deleted', payment });
  } catch (err) {
    console.error('deleteRegPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};