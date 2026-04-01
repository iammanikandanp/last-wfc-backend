import express from "express";
import { protect, authorize } from "../middleware/auth.js";

// Import controllers
import {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updateProfile,
  getAllUsers,
} from "../controllers/authController.js";

import {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  addProgressPhoto,
  getStatistics,
  deleteMember,
} from "../controllers/memberController.js";

import {
  createPayment,
  getAllPayments,
  getPaymentsByMember,
  getPaymentById,
  getRevenueSummary,
} from "../controllers/paymentController.js";

import {
  createRegDietPlan,
  getAllRegDietPlans,
  getRegDietPlanByMember,
  updateRegDietPlan,
  deleteRegDietPlan,
} from "../controllers/Regdietplancontroller.js";

import {
  createTrainer,
  getAllTrainers,
  getTrainerById,
  updateTrainer,
  assignTrainingTomember,
  getTrainingSessions,
  completeSession,
} from "../controllers/trainerController.js";

import {
  importAttendance,
  getAllAttendance,
  getAttendanceByRegistration,
  getAvailableMonths,
  linkAttendanceId,
} from "../controllers/xlsAttendanceController.js";

import {
  getInvoiceById,
  getInvoiceByNumber,
  getAllInvoices,
  getInvoicesByMember,
  markInvoicePrinted,
  markInvoiceSent,
  getInvoiceData,
} from "../controllers/invoiceController.js";

import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../controllers/planController.js";
import { sendInvoiceEmail } from "../controllers/emailController.js";
import { createLead, getAllLeads, updateLead, deleteLead, getLeadStats } from "../controllers/leadController.js";


const router = express.Router();

// ==================== AUTH ROUTES ====================
router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.get("/auth/me", protect, getCurrentUser);
router.put("/auth/profile", protect, updateProfile);
router.get("/auth/users", protect, authorize("admin"), getAllUsers);

// ==================== PLAN ROUTES ====================
router.post("/plans", protect, authorize("admin"), createPlan);
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);
router.put("/plans/:id", protect, authorize("admin"), updatePlan);
router.delete("/plans/:id", protect, authorize("admin"), deletePlan);

// ==================== MEMBER ROUTES ====================
router.post("/members", protect, authorize("admin", "staff"), createMember);
router.get("/members", protect, getAllMembers);
router.get("/members/stats", protect, getStatistics);
router.get("/members/:id", protect, getMemberById);
router.put("/members/:id", protect, authorize("admin", "staff"), updateMember);
router.post("/members/:id/photo", protect, addProgressPhoto);
router.delete("/members/:id", protect, authorize("admin"), deleteMember);

// ==================== PAYMENT ROUTES ====================
router.post("/payments", protect, authorize("admin", "staff"), createPayment);
router.get("/payments", protect, getAllPayments);
router.get("/payments/revenue/summary", protect, authorize("admin"), getRevenueSummary);
router.get("/payments/:id", protect, getPaymentById);
router.get("/payments/member/:memberId", protect, getPaymentsByMember);

// ==================== DIET PLAN ROUTES ====================
router.post("/diet-plans", protect, authorize("admin", "staff", "trainer"), createRegDietPlan);
router.get("/diet-plans", protect, getAllRegDietPlans);
router.get("/diet-plans/member/:memberId", protect, getRegDietPlanByMember);
router.put("/diet-plans/:id", protect, authorize("admin", "staff", "trainer"), updateRegDietPlan);
router.delete("/diet-plans/:id", protect, authorize("admin", "staff", "trainer"), deleteRegDietPlan);

// ==================== TRAINER ROUTES ====================
router.post("/trainers", protect, authorize("admin"), createTrainer);
router.get("/trainers", protect, getAllTrainers);
router.get("/trainers/:id", protect, getTrainerById);
router.put("/trainers/:id", protect, authorize("admin"), updateTrainer);
router.post("/trainers/assign", protect, authorize("admin", "staff"), assignTrainingTomember);
router.get("/trainers/sessions/:memberId", protect, getTrainingSessions);
router.post("/trainers/sessions/complete", protect, authorize("admin", "trainer"), completeSession);

// ==================== ATTENDANCE ROUTES ====================
router.post("/attendance/import", protect, importAttendance);
router.get("/attendance", protect, getAllAttendance);
router.get("/attendance/member/:memberId", protect, getAttendanceByRegistration);
router.get("/attendance/months", protect, getAvailableMonths);
router.post("/attendance/link", protect, linkAttendanceId);

// ==================== INVOICE ROUTES ====================
router.get("/invoices", protect, authorize("admin"), getAllInvoices);
router.get("/invoices/:id", protect, getInvoiceById);
router.get("/invoices/number/:invoiceNumber", protect, getInvoiceByNumber);
router.get("/invoices/member/:memberId", protect, getInvoicesByMember);
router.get("/invoices/:id/data", protect, getInvoiceData);
router.put("/invoices/:id/printed", protect, markInvoicePrinted);
router.put("/invoices/:id/sent", protect, markInvoiceSent);

// ── Leads routes ─────────────────────────────────────────────────────────────
router.post("/leads",          createLead);
router.get("/leads",           getAllLeads);
router.get("/leads/stats",     getLeadStats);
router.put("/leads/:id",       updateLead);
router.delete("/leads/:id",    deleteLead);

router.post("/send-email", sendInvoiceEmail);
export default router;
