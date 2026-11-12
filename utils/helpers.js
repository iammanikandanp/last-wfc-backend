import jwt from "jsonwebtoken";
import { Counter } from "../models/Counter.js";
import { RegPayment } from "../models/RegPayment.js";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "5h",
  });
};

// Calculate BMI
export const calculateBMI = (weight, height) => {
  // weight in kg, height in cm
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

// Get fitness category based on BMI
export const getFitnessCategory = (bmi) => {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

// Calculate waist-hip ratio
export const calculateWaistHipRatio = (waist, hip) => {
  return parseFloat((waist / hip).toFixed(2));
};

let isCounterInitialized = false;

// Generate sequential invoice number
export const getNextInvoiceNumber = async () => {
  if (!isCounterInitialized) {
    const counterDoc = await Counter.findOne({ id: "invoiceNo" });
    if (!counterDoc) {
      const regPayments = await RegPayment.find({}, 'invoiceNo').lean();
      const invoices = await Invoice.find({}, 'invoiceNumber').lean();
      const payments = await Payment.find({}, 'invoiceNumber').lean();
      
      let max = 0;
      const checkMax = (str) => {
        if (!str) return;
        if (/^\d+$/.test(String(str))) {
           const num = parseInt(str, 10);
           if (num > max) max = num;
        }
      };
      
      regPayments.forEach(p => checkMax(p.invoiceNo));
      invoices.forEach(i => checkMax(i.invoiceNumber));
      payments.forEach(p => checkMax(p.invoiceNumber));
      
      await Counter.create({ id: "invoiceNo", seq: max });
    }
    isCounterInitialized = true;
  }
  
  const updated = await Counter.findOneAndUpdate(
    { id: "invoiceNo" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  return `WFC-INV-${String(updated.seq).padStart(4, '0')}`;
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Parses a date into local Date object (year, month, day at 00:00:00 local time)
export const parseLocalDate = (d) => {
  if (!d) return null;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

// Formats date into local 'YYYY-MM-DD'
export const toLocalDateStr = (dt) => {
  if (!dt) return "";
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Adds calendar months with proper month-end clamping and leap-year handling
export const addCalendarMonths = (dateInput, months) => {
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return "";
  const numMonths = Number(months);
  if (isNaN(numMonths) || numMonths <= 0) return toLocalDateStr(d);

  const startDay = d.getDate();
  const startMonth = d.getMonth();
  const startYear = d.getFullYear();

  const totalMonths = startMonth + numMonths;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(startDay, daysInTargetMonth);

  return toLocalDateStr(new Date(targetYear, targetMonth, targetDay));
};

// Returns day immediately after the date as 'YYYY-MM-DD'
export const getDayAfter = (dateInput) => {
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return toLocalDateStr(d);
};

// Returns difference in whole calendar days
export const getCalendarDiffDays = (endDate, referenceDate = new Date()) => {
  if (!endDate) return null;
  const end = parseLocalDate(endDate);
  const ref = parseLocalDate(toLocalDateStr(referenceDate));
  if (!end || !ref || isNaN(end.getTime()) || isNaN(ref.getTime())) return null;
  return Math.round((end.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
};

// Calculates suggested next package start date based on existing membership
export const getSuggestedStartDate = (memberEndDate, memberStatus, referenceDate = new Date()) => {
  const todayStr = toLocalDateStr(referenceDate);
  const today = parseLocalDate(todayStr);

  if (!memberEndDate || memberStatus === 'blocked') {
    return {
      startDate: todayStr,
      hasActiveMembership: false,
      remainingDays: 0,
      existingEndDate: memberEndDate ? toLocalDateStr(memberEndDate) : null,
    };
  }

  const end = parseLocalDate(memberEndDate);
  if (!end || isNaN(end.getTime())) {
    return {
      startDate: todayStr,
      hasActiveMembership: false,
      remainingDays: 0,
      existingEndDate: null,
    };
  }

  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    return {
      startDate: getDayAfter(end),
      hasActiveMembership: true,
      remainingDays: diffDays,
      existingEndDate: toLocalDateStr(end),
    };
  }

  return {
    startDate: todayStr,
    hasActiveMembership: false,
    remainingDays: 0,
    existingEndDate: toLocalDateStr(end),
  };
};

// Check if membership is expiring soon (within 7 days)
export const isExpiringsoon = (expiryDate) => {
  const diffDays = getCalendarDiffDays(expiryDate);
  return diffDays !== null && diffDays >= 0 && diffDays <= 7;
};

// Check if membership is overdue
export const isOverdue = (expiryDate) => {
  const diffDays = getCalendarDiffDays(expiryDate);
  return diffDays !== null && diffDays < 0;
};

// Compute membership status from start/end dates
export const computeMembershipStatus = (startDate, endDate) => {
  if (!startDate && !endDate) return "pending";
  if (!endDate) return "active";
  const diffDays = getCalendarDiffDays(endDate);
  if (diffDays === null) return "pending";
  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring";
  return "active";
};

export const parseMonthDuration = (planName) => {
  const planDurations = {
    "Guest Plan": 1,
    "Basic Plan": 30,
    "Standard Plan": 90,
    "Premium Plan": 180,
  };
  return planDurations[planName] || 0;
};
