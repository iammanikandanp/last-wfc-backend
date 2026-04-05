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
  parser.fields([
    { name: "profileImage",   maxCount: 1 },
    { name: "frontBodyImage", maxCount: 1 },
    { name: "sideBodyImage",  maxCount: 1 },
    { name: "backBodyImage",  maxCount: 1 },
  ]),
  register
);
router.get("/fetch",        fetch);
router.get("/fetchone/:id", fetchOne);
router.post(
  "/update/:id",
  parser.fields([
    { name: "profileImage",   maxCount: 1 },
    { name: "frontBodyImage", maxCount: 1 },
    { name: "sideBodyImage",  maxCount: 1 },
    { name: "backBodyImage",  maxCount: 1 },
  ]),
  updatereg
);
router.post("/delete/:id", deletereg);

// ── Payments ──────────────────────────────────────────────────────────────────
router.post("/reg-payments",                createRegPayment);
router.get("/reg-payments",                 getAllRegPayments);
router.get("/reg-payments/revenue/summary", getRevenueSummary);
router.get("/reg-payments/member/:id",      getRegPaymentsByMember);
router.patch("/reg-payments/pdf/:id",       patchPdfUrl);
router.put("/reg-payments/:id",             updateRegPayment);
router.delete("/reg-payments/:id",          deleteRegPayment);

// ── RegDiet Plans ─────────────────────────────────────────────────────────────
router.post("/reg-diet-plans",           createRegDietPlan);
router.get("/reg-diet-plans",            getAllRegDietPlans);
router.get("/reg-diet-plans/member/:id", getRegDietPlanByMember);
router.put("/reg-diet-plans/:id",        updateRegDietPlan);
router.delete("/reg-diet-plans/:id",     deleteRegDietPlan);

// ── Member Diet CSV ───────────────────────────────────────────────────────────
router.post("/member-diet/import",              csvUpload.single("file"), importDietCSV);
router.get("/member-diet/member/:memberId",     getDietByMember);
router.get("/member-diet/member/:memberId/all", getAllDietsByMember);
router.put("/member-diet/:id",                  updateDiet);
router.put("/member-diet/:id/day/:dayId",       updateDietDay);
router.delete("/member-diet/:id",               deleteDiet);

// ── RegWorkout Plans ──────────────────────────────────────────────────────────
router.post("/reg-workout-plans",           createRegWorkoutPlan);
router.get("/reg-workout-plans",            getAllRegWorkoutPlans);
router.get("/reg-workout-plans/member/:id", getRegWorkoutPlanByMember);
router.put("/reg-workout-plans/:id",        updateRegWorkoutPlan);
router.delete("/reg-workout-plans/:id",     deleteRegWorkoutPlan);

// ── Attendance ────────────────────────────────────────────────────────────────
router.post("/xls-attendance/import",    importAttendance);
router.get("/xls-attendance",            getAllAttendance);
router.get("/xls-attendance/months",     getAvailableMonths);
router.get("/xls-attendance/member/:id", getAttendanceByRegistration);
router.post("/xls-attendance/link",      linkAttendanceId);
router.delete("/xls-attendance",         deleteAllAttendance);

// ── Member Workout CSV ────────────────────────────────────────────────────────
router.post("/member-workout/import",              csvUpload.single("file"), importWorkoutCSV);
router.get("/member-workout/member/:memberId",     getWorkoutByMember);
router.get("/member-workout/member/:memberId/all", getAllWorkoutsByMember);
router.put("/member-workout/:id",                  updateWorkout);
router.put("/member-workout/:id/day/:dayId",       updateWorkoutDay);
router.delete("/member-workout/:id",               deleteWorkout);

// ── Leads ─────────────────────────────────────────────────────────────────────
router.post("/leads",       createLead);
router.get("/leads/stats",  getLeadStats);
router.get("/leads",        getAllLeads);
router.put("/leads/:id",    updateLead);
router.delete("/leads/:id", deleteLead);

// ── Email ─────────────────────────────────────────────────────────────────────
router.post("/send-email", sendInvoiceEmail);

// ── PDF Upload (signed Cloudinary upload via backend) ─────────────────────────
router.post("/upload-pdf", pdfUpload.single("file"), uploadInvoicePdf);

export default router;
