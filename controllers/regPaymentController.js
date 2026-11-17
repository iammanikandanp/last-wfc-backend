import { RegPayment } from "../models/RegPayment.js";
import { Registration } from "../models/registration.js";
import { Member } from "../models/Member.js";
import { recordAdmissionIncome } from "../utils/recordAdmissionIncome.js";
import {
  getNextInvoiceNumber,
  parseLocalDate,
  toLocalDateStr,
  computeMembershipStatus,
  calculateDurationFromDates,
  recalculatePackageName,
} from "../utils/helpers.js";
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

    // 1. Determine effective start and end dates
    const finalStartDateInput = req.body.startDate !== undefined ? req.body.startDate : before.startDate;
    const finalEndDateInput   = req.body.endDate !== undefined ? req.body.endDate : before.endDate;

    const finalStartDate = finalStartDateInput ? parseLocalDate(toLocalDateStr(finalStartDateInput)) : null;
    const finalEndDate   = finalEndDateInput ? parseLocalDate(toLocalDateStr(finalEndDateInput)) : null;

    // 2. Automatically recalculate duration and package if dates are present
    let finalDuration = before.duration;
    let finalPackage = req.body.package !== undefined ? req.body.package : before.package;
    let durationStr = "";

    if (finalStartDate && finalEndDate) {
      const dur = calculateDurationFromDates(finalStartDate, finalEndDate);
      finalDuration = dur.durationNumber || finalDuration;
      durationStr = dur.durationStr;
      finalPackage = recalculatePackageName(finalPackage, dur.months, dur.durationStr);
    }

    const datesChanged =
      (before.startDate && finalStartDate && toLocalDateStr(before.startDate) !== toLocalDateStr(finalStartDate)) ||
      (before.endDate && finalEndDate && toLocalDateStr(before.endDate) !== toLocalDateStr(finalEndDate));

    // 3. Update payment document
    const paymentUpdatePayload = {
      ...req.body,
      ...(finalStartDate ? { startDate: finalStartDate } : {}),
      ...(finalEndDate ? { endDate: finalEndDate } : {}),
      ...(finalPackage ? { package: finalPackage } : {}),
      ...(finalDuration !== undefined ? { duration: finalDuration } : {}),
      ...(datesChanged && !req.body.pdfUrl ? { pdfUrl: "" } : {}),
    };

    const payment = await RegPayment.findByIdAndUpdate(
      req.params.id,
      paymentUpdatePayload,
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // 4. Update the corresponding Registration (member) record
    const regId = payment.registrationId || before.registrationId;
    let member = null;
    if (regId) {
      member = await Registration.findById(regId);
    }
    if (!member && (payment.memberPhone || before.memberPhone)) {
      member = await Registration.findOne({ phone: payment.memberPhone || before.memberPhone });
    }

    if (member) {
      const allPayments = await RegPayment.find({
        $or: [
          { registrationId: member._id },
          { memberPhone: member.phone }
        ]
      }).sort({ endDate: -1 }).lean();

      // Determine highest end date among all member payments
      let highestPayment = payment;
      for (const p of allPayments) {
        const pEnd = p._id.toString() === payment._id.toString()
          ? finalEndDate
          : (p.endDate ? parseLocalDate(toLocalDateStr(p.endDate)) : null);
        const highestEnd = highestPayment._id.toString() === payment._id.toString()
          ? finalEndDate
          : (highestPayment.endDate ? parseLocalDate(toLocalDateStr(highestPayment.endDate)) : null);

        if (pEnd && (!highestEnd || pEnd >= highestEnd)) {
          highestPayment = p._id.toString() === payment._id.toString() ? payment : p;
        }
      }

      const isLatestOrCurrent =
        allPayments.length <= 1 ||
        highestPayment._id.toString() === payment._id.toString() ||
        (before.endDate && member.endDate && toLocalDateStr(before.endDate) === toLocalDateStr(member.endDate));

      if (isLatestOrCurrent && finalEndDate) {
        member.endDate = finalEndDate;
        if (finalStartDate) {
          if (allPayments.length <= 1 || (before.startDate && member.startDate && toLocalDateStr(before.startDate) === toLocalDateStr(member.startDate))) {
            member.startDate = finalStartDate;
          }
        }
        member.duration = durationStr || (finalDuration ? `${finalDuration} Month${finalDuration !== 1 ? 's' : ''}` : member.duration);
        member.packages = finalPackage || member.packages;

        // Recalculate status while preserving Hold/Freeze and Blocked states
        if (member.status !== 'blocked') {
          if (member.isOnHold || member.status === 'hold') {
            // Member is on hold: preserve hold status and frozenRemainingDays
            member.originalEndDateBeforeHold = finalEndDate;
          } else {
            member.status = computeMembershipStatus(member.startDate, member.endDate, member);
          }
        }
        await member.save();
      }

      // Sync secondary Member model if it exists
      try {
        const memberDoc = await Member.findOne({
          $or: [
            { _id: member._id },
            { userId: member._id }
          ]
        });
        if (memberDoc && isLatestOrCurrent && finalEndDate) {
          memberDoc.expiryDate = finalEndDate;
          if (finalStartDate) memberDoc.startDate = finalStartDate;
          if (member.status !== 'blocked' && !member.isOnHold && member.status !== 'hold') {
            memberDoc.status = member.status === 'expiring' ? 'active' : member.status;
          }
          await memberDoc.save();
        }
      } catch (mErr) {
        // Silent best effort for secondary Member model
      }
    }

    // 5. If this update collected additional money (e.g. paying off a balance),
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

    return res.status(200).json({ success: true, message: 'Payment updated', payment, member });
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

    // If deleted payment was the member's current package, sync member to remaining payments
    const regId = payment.registrationId;
    if (regId) {
      const remainingPayments = await RegPayment.find({ registrationId: regId, _id: { $ne: payment._id } }).sort({ endDate: -1 }).lean();
      const member = await Registration.findById(regId);
      if (member) {
        if (remainingPayments.length > 0) {
          const latest = remainingPayments[0];
          member.endDate = latest.endDate;
          member.startDate = latest.startDate;
          member.packages = latest.package;
          const { durationStr } = calculateDurationFromDates(latest.startDate, latest.endDate);
          member.duration = durationStr;
          if (member.status !== 'blocked' && !member.isOnHold && member.status !== 'hold') {
            member.status = computeMembershipStatus(member.startDate, member.endDate, member);
          }
        }
        await member.save();
      }
    }

    return res.status(200).json({ success: true, message: 'Payment moved to recycle bin', payment });
  } catch (err) {
    console.error('deleteRegPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Quick Update / Collect Additional Payment ─────────────────────────────────
export const collectPaymentInstallment = async (req, res) => {
  try {
    const { amount, paymentMode = "cash", paymentDate, note = "" } = req.body;
    const paymentAmount = Number(amount);

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid payment amount greater than 0" });
    }

    const payment = await RegPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    const currentBalance = Number(payment.balanceAmount || 0);
    if (currentBalance > 0 && paymentAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toLocaleString("en-IN")}) cannot exceed the remaining balance (₹${currentBalance.toLocaleString("en-IN")})`,
      });
    }

    const parsedDate = paymentDate ? parseLocalDate(toLocalDateStr(paymentDate)) : new Date();
    const rawMode = String(paymentMode || payment.paymentMode || "cash").toLowerCase();
    const normalizedMode = rawMode === "gpay" ? "upi" : ["cash", "upi", "card"].includes(rawMode) ? rawMode : "cash";

    // 1. Initialize paymentHistory with previous advance if not already present
    if (!Array.isArray(payment.paymentHistory)) {
      payment.paymentHistory = [];
    }
    if (payment.paymentHistory.length === 0 && (payment.advanceAmount || 0) > 0) {
      payment.paymentHistory.push({
        amount: Number(payment.advanceAmount),
        paymentMode: payment.paymentMode || "cash",
        date: payment.issuedDate || payment.createdAt || new Date(),
        note: "Initial payment",
      });
    }

    // 2. Append new installment transaction
    payment.paymentHistory.push({
      amount: paymentAmount,
      paymentMode: normalizedMode,
      date: parsedDate,
      recordedBy: req.user?._id,
      note: note || "Additional payment collected",
    });

    // 3. Update cumulative totals
    payment.advanceAmount = (Number(payment.advanceAmount) || 0) + paymentAmount;
    payment.balanceAmount = Math.max(0, (Number(payment.finalAmount) || Number(payment.amount) || 0) - payment.advanceAmount);
    payment.paymentMode = normalizedMode; // set latest payment mode
    payment.issuedDate = parsedDate;

    if (payment.balanceAmount === 0) {
      payment.paymentType = "full";
      payment.paymentStatus = "completed";
      payment.writtenOff = false;
      payment.writtenOffAt = null;
    } else {
      payment.paymentType = "partly";
    }

    // Clear cached PDF invoice URL so any newly downloaded invoice reflects the updated paid balance
    payment.pdfUrl = "";

    await payment.save();

    // 4. Record newly collected money as Admission Income
    await recordAdmissionIncome({
      amountPaid: paymentAmount,
      memberName: payment.memberName,
      invoiceNo: payment.invoiceNo,
      paymentMode: normalizedMode,
      date: parsedDate,
      createdBy: req.user?._id,
    });

    return res.status(200).json({
      success: true,
      message: `₹${paymentAmount.toLocaleString("en-IN")} collected successfully`,
      payment,
    });
  } catch (err) {
    console.error("collectPaymentInstallment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
