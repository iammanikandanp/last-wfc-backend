import express from "express";
import multer from "multer";
import parser from "../middleware/multer.js";

// ── Auth ──────────────────────────────────────────────────────────────────────
import { protect, authorize } from "../middleware/auth.js";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updateProfile,
  getAllUsers,
} from "../controllers/authController.js";

// ── Feature Controllers ───────────────────────────────────────────────────────
import { deletereg, fetch, fetchOne, register, updatereg } from "../controllers/control.js";
import {
  createRegPayment,
  getAllRegPayments,
  getRegPaymentsByMember,
  getRevenueSummary,
  patchPdfUrl,
  updateRegPayment,
  deleteRegPayment,
} from "../controllers/regPaymentController.js";
import {
  createRegDietPlan,
  getAllRegDietPlans,
  getRegDietPlanByMember,
  updateRegDietPlan,
  deleteRegDietPlan,
} from "../controllers/regDietPlanController.js";
import {
  importAttendance,
  getAllAttendance,
  getAttendanceByRegistration,
  getAvailableMonths,
  linkAttendanceId,
  deleteAllAttendance,
} from "../controllers/xlsAttendanceController.js";
import { sendInvoiceEmail } from "../controllers/emailController.js";
import { uploadInvoicePdf, pdfUpload } from "../controllers/uploadPdfController.js";
import { viewInvoice } from "../controllers/invoiceViewController.js";
import {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
} from "../controllers/leadController.js";
import {
  importDietCSV,
  getDietByMember,
  getAllDietsByMember,
  updateDiet,
  updateDietDay,
  deleteDiet,
} from "../controllers/memberDietController.js";
import {
  createRegWorkoutPlan,
  getAllRegWorkoutPlans,
  getRegWorkoutPlanByMember,
  updateRegWorkoutPlan,
  deleteRegWorkoutPlan,
} from "../controllers/regWorkoutPlanController.js";
import {
  importWorkoutCSV,
  getWorkoutByMember,
  getAllWorkoutsByMember,
  updateWorkout,
  updateWorkoutDay,
  deleteWorkout,
} from "../controllers/memberWorkoutController.js";
import { proxyGSheetCSV } from "../controllers/gsheetProxyController.js";

const router = express.Router();

// CSV files → in-memory buffer
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are allowed"), false);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES  (no token required)
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/register",       registerUser);
router.post("/auth/login",          loginUser);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);

// ── Public invoice viewer (shared via WhatsApp) ───────────────────────────────
router.get("/invoice/:id", viewInvoice);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES  (Bearer token required on every request below)
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect);   // ← all routes defined after this line require a valid JWT

// ── Auth (current user) ───────────────────────────────────────────────────────
router.get("/auth/me",              getCurrentUser);
router.put("/auth/profile",         updateProfile);
router.get("/auth/users",           authorize("admin"), getAllUsers);

// ── Registration ──────────────────────────────────────────────────────────────
router.post(
  "/register",
  authorize("admin", "trainer"),
  parser.fields([
    { name: "profileImage",   maxCount: 1 },
    { name: "frontBodyImage", maxCount: 1 },
    { name: "sideBodyImage",  maxCount: 1 },
    { name: "backBodyImage",  maxCount: 1 },
  ]),
  register
);
router.get("/fetch",        authorize("admin", "trainer"), fetch);
router.get("/fetchone/:id", fetchOne);   // controller enforces member ownership
router.post(
  "/update/:id",
  authorize("admin", "trainer"),
  parser.fields([
    { name: "profileImage",   maxCount: 1 },
    { name: "frontBodyImage", maxCount: 1 },
    { name: "sideBodyImage",  maxCount: 1 },
    { name: "backBodyImage",  maxCount: 1 },
  ]),
  updatereg
);
router.post("/delete/:id", authorize("admin"), deletereg);

// ── Payments ──────────────────────────────────────────────────────────────────
router.post("/reg-payments", (req, res, next) => {
  if (req.user.role === "admin") return next();
  if (req.user.role === "trainer" && req.user.canManagePayments) return next();
  return res.status(403).json({ success: false, message: "Not authorized to create payments" });
}, createRegPayment);
router.get("/reg-payments",                 authorize("admin", "trainer"), getAllRegPayments);
router.get("/reg-payments/revenue/summary", authorize("admin"),            getRevenueSummary);
router.get("/reg-payments/member/:id",      getRegPaymentsByMember);  // controller enforces member ownership
router.patch("/reg-payments/pdf/:id",       authorize("admin", "trainer"), patchPdfUrl);
router.put("/reg-payments/:id", (req, res, next) => {
  if (req.user.role === "admin") return next();
  if (req.user.role === "trainer" && req.user.canManagePayments) return next();
  return res.status(403).json({ success: false, message: "Not authorized to update payments" });
}, updateRegPayment);
router.delete("/reg-payments/:id",          authorize("admin"), deleteRegPayment);

// ── RegDiet Plans ─────────────────────────────────────────────────────────────
router.post("/reg-diet-plans",           authorize("admin", "trainer"), createRegDietPlan);
router.get("/reg-diet-plans",            authorize("admin", "trainer"), getAllRegDietPlans);
router.get("/reg-diet-plans/member/:id", getRegDietPlanByMember);
router.put("/reg-diet-plans/:id",        authorize("admin", "trainer"), updateRegDietPlan);
router.delete("/reg-diet-plans/:id",     authorize("admin", "trainer"), deleteRegDietPlan);

// ── Member Diet CSV ───────────────────────────────────────────────────────────
router.post("/member-diet/import",              authorize("admin", "trainer"), csvUpload.single("file"), importDietCSV);
router.get("/member-diet/member/:memberId",     getDietByMember);
router.get("/member-diet/member/:memberId/all", getAllDietsByMember);
router.put("/member-diet/:id",                  authorize("admin", "trainer"), updateDiet);
router.put("/member-diet/:id/day/:dayId",       authorize("admin", "trainer"), updateDietDay);
router.delete("/member-diet/:id",               authorize("admin", "trainer"), deleteDiet);

// ── RegWorkout Plans ──────────────────────────────────────────────────────────
router.post("/reg-workout-plans",           authorize("admin", "trainer"), createRegWorkoutPlan);
router.get("/reg-workout-plans",            authorize("admin", "trainer"), getAllRegWorkoutPlans);
router.get("/reg-workout-plans/member/:id", getRegWorkoutPlanByMember);
router.put("/reg-workout-plans/:id",        authorize("admin", "trainer"), updateRegWorkoutPlan);
router.delete("/reg-workout-plans/:id",     authorize("admin", "trainer"), deleteRegWorkoutPlan);

// ── Google Sheet CSV Proxy ────────────────────────────────────────────────────
router.get("/proxy/gsheet-csv", proxyGSheetCSV);

// ── Attendance ────────────────────────────────────────────────────────────────
router.post("/xls-attendance/import",    authorize("admin", "trainer"), importAttendance);
router.get("/xls-attendance",            authorize("admin", "trainer"), getAllAttendance);
router.get("/xls-attendance/months",     authorize("admin", "trainer"), getAvailableMonths);
router.get("/xls-attendance/member/:id", getAttendanceByRegistration);
router.post("/xls-attendance/link",      authorize("admin", "trainer"), linkAttendanceId);
router.delete("/xls-attendance",         authorize("admin"),            deleteAllAttendance);

// ── Member Workout CSV ────────────────────────────────────────────────────────
router.post("/member-workout/import",              authorize("admin", "trainer"), csvUpload.single("file"), importWorkoutCSV);
router.get("/member-workout/member/:memberId",     getWorkoutByMember);
router.get("/member-workout/member/:memberId/all", getAllWorkoutsByMember);
router.put("/member-workout/:id",                  authorize("admin", "trainer"), updateWorkout);
router.put("/member-workout/:id/day/:dayId",       authorize("admin", "trainer"), updateWorkoutDay);
router.delete("/member-workout/:id",               authorize("admin", "trainer"), deleteWorkout);

// ── Leads ─────────────────────────────────────────────────────────────────────
router.post("/leads",       authorize("admin", "trainer"), createLead);
router.get("/leads/stats",  authorize("admin", "trainer"), getLeadStats);
router.get("/leads",        authorize("admin", "trainer"), getAllLeads);
router.put("/leads/:id",    authorize("admin", "trainer"), updateLead);
router.delete("/leads/:id", authorize("admin"),            deleteLead);

// ── Email ─────────────────────────────────────────────────────────────────────
router.post("/send-email", authorize("admin", "trainer"), sendInvoiceEmail);

// ── PDF Upload (signed Cloudinary upload via backend) ─────────────────────────
router.post("/upload-pdf", authorize("admin", "trainer"), pdfUpload.single("file"), uploadInvoicePdf);

export default router;
