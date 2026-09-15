import jwt from "jsonwebtoken";
import { Counter } from "../models/Counter.js";
import { RegPayment } from "../models/RegPayment.js";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "30d",
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

// Check if membership is expiring soon (within 7 days)
export const isExpiringsoon = (expiryDate) => {
  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date(expiryDate) <= sevenDaysFromNow && new Date(expiryDate) > today;
};

// Check if membership is overdue
export const isOverdue = (expiryDate) => {
  return new Date(expiryDate) < new Date();
};

// Compute membership status from start/end dates
export const computeMembershipStatus = (startDate, endDate) => {
  if (!startDate && !endDate) return "pending";
  const now = new Date();
  if (!endDate) return "active";
  const ed = new Date(endDate);
  const diffDays = Math.ceil((ed - now) / (1000 * 60 * 60 * 24));
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
