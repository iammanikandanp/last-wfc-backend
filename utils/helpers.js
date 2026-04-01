import jwt from "jsonwebtoken";

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

// Generate invoice number
export const generateInvoiceNumber = () => {
  return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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

export const parseMonthDuration = (planName) => {
  const planDurations = {
    "Guest Plan": 1,
    "Basic Plan": 30,
    "Standard Plan": 90,
    "Premium Plan": 180,
  };
  return planDurations[planName] || 0;
};
