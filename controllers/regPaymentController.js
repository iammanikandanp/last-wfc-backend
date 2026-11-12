import { RegPayment } from "../models/RegPayment.js";
import { Registration } from "../models/registration.js";
import { recordAdmissionIncome } from "../utils/recordAdmissionIncome.js";
import { getNextInvoiceNumber, parseLocalDate, toLocalDateStr } from "../utils/helpers.js";
import { moveToRecycleBin } from "../utils/recycle.js";

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
      isRenewal,
      advanceAmount,
      balanceAmount,
      startDate,
      endDate,
      issuedDate,
      pdfUrl,
      paymentStatus,
      renewalDate,
      duration,
      nextDueDate,
    } = req.body;

    if (!registrationId || !pkg || amount === undefined || amount === null || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: registrationId, package, amount, paymentMode",
      });
    }

    // Validate dates
    const parsedStartDate = parseLocalDate(startDate);
    const parsedEndDate   = parseLocalDate(endDate);

    if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid start date is required",
      });
    }
    if (!parsedEndDate || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid end date is required",
      });
    }
    if (parsedEndDate <= parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Fetch member details from Registration
    const member = await Registration.findById(registrationId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (member.status === 'blocked') {
      return res.status(403).json({ success: false, message: "Member is blocked and cannot receive payments via this API" });
    }

    // Prevent duplicate package extensions submitted in quick succession (< 10 seconds)
    const duplicateWindow = new Date(Date.now() - 10000);
    const recentDuplicate = await RegPayment.findOne({
      registrationId,
      package: pkg,
      amount: Number(amount),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      createdAt: { $gte: duplicateWindow },
    });
    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: "A payment with identical details was just submitted. Duplicate prevented.",
        payment: recentDuplicate,
      });
    }

    const invoiceNo = await getNextInvoiceNumber();

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
      isRenewal:     Boolean(isRenewal),
      advanceAmount: Number(advanceAmount) || Number(finalAmount),
      balanceAmount: Number(balanceAmount) || 0,
      paymentStatus: "completed",
      invoiceNo,
      startDate:     parsedStartDate,
      endDate:       parsedEndDate,
      issuedDate:    issuedDate ? parseLocalDate(issuedDate) : new Date(),
      nextDueDate:   nextDueDate ? new Date(nextDueDate) : null,
      renewalDate:   renewalDate ? new Date(renewalDate) : new Date(),
      duration:      duration ? Number(duration) : null,
      pdfUrl:        pdfUrl || "",
      transactionId: `TXN-${Date.now()}`,
    });

    await payment.save();

    // Safely update member: preserve existing membership length without overwriting or shortening
    let finalMemberEndDate = parsedEndDate;
    if (member.endDate) {
      const existingEnd = parseLocalDate(member.endDate);
      if (existingEnd && existingEnd > parsedEndDate) {
        finalMemberEndDate = existingEnd;
      }
    }

    // Preserve ongoing membership start date if the member is currently active
    const todayMidnight = parseLocalDate(toLocalDateStr(new Date()));
    let finalMemberStartDate = parsedStartDate;
    if (member.startDate && member.endDate) {
      const existingStart = parseLocalDate(member.startDate);
      const existingEnd   = parseLocalDate(member.endDate);
      if (existingStart && existingEnd && existingStart <= todayMidnight && existingEnd >= todayMidnight) {
        finalMemberStartDate = existingStart;
      }
    }

    await Registration.findByIdAndUpdate(registrationId, {
      endDate:   finalMemberEndDate,
      startDate: finalMemberStartDate,
      packages:  pkg,
      status:    "active",
      ...(duration ? { duration: String(duration) } : {}),
    });

    // Reflect the amount actually collected as Income → Admission
    await recordAdmissionIncome({
      amountPaid: payment.advanceAmount,
      memberName: payment.memberName,
      invoiceNo:  payment.invoiceNo,
      paymentMode: payment.paymentMode,
      date:       payment.issuedDate,
      createdBy:  req.user._id,
    });

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
    if (
      req.user.role === "member" &&
      (!req.user.registrationId || req.user.registrationId.toString() !== req.params.id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

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
    const all = await RegPayment.find({ paymentStatus: "completed" }).lean();

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
    const before = await RegPayment.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: 'Payment not found' });
    const previouslyPaid = before.advanceAmount || 0;

    const payment = await RegPayment.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // If this update collected additional money (e.g. paying off a balance),
    // reflect only the newly collected delta as Income → Admission.
    const newlyPaid = (payment.advanceAmount || 0) - previouslyPaid;
    if (newlyPaid > 0) {
      await recordAdmissionIncome({
        amountPaid: newlyPaid,
        memberName: payment.memberName,
        invoiceNo: payment.invoiceNo,
        paymentMode: payment.paymentMode,
        createdBy: req.user._id,
      });
    }

    return res.status(200).json({ success: true, message: 'Payment updated', payment });
  } catch (err) {
    console.error('updateRegPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Payment ────────────────────────────────────────────────────────────
export const deleteRegPayment = async (req, res) => {
  try {
    const payment = await RegPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    await moveToRecycleBin(RegPayment, req.params.id, "RegPayment", req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment moved to recycle bin', payment });
  } catch (err) {
    console.error('deleteRegPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};