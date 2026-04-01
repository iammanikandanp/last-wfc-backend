// ─── ADD THESE ROUTES TO YOUR wfc-software-backend-main/routers/routers.js ───
//
// Step 1: Import the new controllers at the top of routers.js:
//
// import {
//   importDietCSV, getDietByMember, getAllDietsByMember,
//   updateDiet, updateDietDay, deleteDiet,
// } from "../controllers/memberDietController.js";
//
// import {
//   importWorkoutCSV, getWorkoutByMember, getAllWorkoutsByMember,
//   updateWorkout, updateWorkoutDay, deleteWorkout,
// } from "../controllers/memberWorkoutController.js";
//
// Step 2: The multer `parser` is already imported in routers.js.
//         For CSV files we need memoryStorage (buffer). Add this multer config:
//
// import multer from "multer";
// const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
//
// Step 3: Add these routes inside the router:

// ── Diet CSV Routes ────────────────────────────────────────────────────────────
// POST   /api/v1/member-diet/import          — upload CSV file + registrationId
// GET    /api/v1/member-diet/member/:memberId — get active diet for a member
// GET    /api/v1/member-diet/member/:memberId/all — all diet plans (history)
// PUT    /api/v1/member-diet/:id              — update entire plan
// PUT    /api/v1/member-diet/:id/day/:dayId   — update single day
// DELETE /api/v1/member-diet/:id              — soft-delete plan

// router.post("/member-diet/import",               csvUpload.single("file"), importDietCSV);
// router.get("/member-diet/member/:memberId",       getDietByMember);
// router.get("/member-diet/member/:memberId/all",   getAllDietsByMember);
// router.put("/member-diet/:id",                    updateDiet);
// router.put("/member-diet/:id/day/:dayId",         updateDietDay);
// router.delete("/member-diet/:id",                 deleteDiet);

// ── Workout CSV Routes ─────────────────────────────────────────────────────────
// POST   /api/v1/member-workout/import             — upload CSV file + registrationId
// GET    /api/v1/member-workout/member/:memberId    — get active workout for a member
// GET    /api/v1/member-workout/member/:memberId/all — all workout plans (history)
// PUT    /api/v1/member-workout/:id                — update entire plan
// PUT    /api/v1/member-workout/:id/day/:dayId     — update single day
// DELETE /api/v1/member-workout/:id                — soft-delete plan

// router.post("/member-workout/import",              csvUpload.single("file"), importWorkoutCSV);
// router.get("/member-workout/member/:memberId",     getWorkoutByMember);
// router.get("/member-workout/member/:memberId/all", getAllWorkoutsByMember);
// router.put("/member-workout/:id",                  updateWorkout);
// router.put("/member-workout/:id/day/:dayId",       updateWorkoutDay);
// router.delete("/member-workout/:id",               deleteWorkout);

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE routers.js snippet (ready to paste):
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import multer from "multer";
import parser from "../middleware/multer.js";

import { deletereg, fetch, fetchOne, register, updatereg } from "../controllers/control.js";
import { createRegPayment, getAllRegPayments, getRegPaymentsByMember, getRevenueSummary, patchPdfUrl, updateRegPayment, deleteRegPayment } from "../controllers/regPaymentController.js";
import { createRegDietPlan, getAllRegDietPlans, getRegDietPlanByMember, updateRegDietPlan, deleteRegDietPlan } from "../controllers/regDietPlanController.js";
import { importAttendance, getAllAttendance, getAttendanceByRegistration, getAvailableMonths, linkAttendanceId } from "../controllers/xlsAttendanceController.js";
import { sendInvoiceEmail } from "../controllers/emailController.js";
import { createLead, getAllLeads, updateLead, deleteLead, getLeadStats } from "../controllers/leadController.js";

// ── NEW imports ───────────────────────────────────────────────────────────────
import { importDietCSV, getDietByMember, getAllDietsByMember, updateDiet, updateDietDay, deleteDiet } from "../controllers/memberDietController.js";
// import { importWorkoutCSV, getWorkoutByMember, getAllWorkoutsByMember, updateWorkout, updateWorkoutDay, deleteWorkout } from "../controllers/memberWorkoutController.js";
import {
  createRegWorkoutPlan,
  getAllRegWorkoutPlans,
  getRegWorkoutPlanByMember,
  updateRegWorkoutPlan,
  deleteRegWorkoutPlan,
} from "../controllers/regWorkoutPlanController.js";
 
const router = express.Router();

// CSV files → in-memory buffer (no disk write needed)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are allowed"), false);
    }
  },
});

// ── Registration ──────────────────────────────────────────────────────────────
router.post("/register",
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
router.post("/update/:id",
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

// ── RegDiet Plans (existing) ──────────────────────────────────────────────────
router.post("/reg-diet-plans",            createRegDietPlan);
router.get("/reg-diet-plans",             getAllRegDietPlans);
router.get("/reg-diet-plans/member/:id",  getRegDietPlanByMember);
router.put("/reg-diet-plans/:id",         updateRegDietPlan);
router.delete("/reg-diet-plans/:id",      deleteRegDietPlan);

// ── Member Diet CSV ────────────────────────────────────────────────────────────
router.post("/member-diet/import",               csvUpload.single("file"), importDietCSV);
router.get("/member-diet/member/:memberId",       getDietByMember);
router.get("/member-diet/member/:memberId/all",   getAllDietsByMember);
router.put("/member-diet/:id",                    updateDiet);
router.put("/member-diet/:id/day/:dayId",         updateDietDay);
router.delete("/member-diet/:id",                 deleteDiet);

// ── Member Workout CSV ────────────────────────────────────────────────────────
// router.post("/member-workout/import",              csvUpload.single("file"), importWorkoutCSV);
// router.get("/member-workout/member/:memberId",     getWorkoutByMember);
// router.get("/member-workout/member/:memberId/all", getAllWorkoutsByMember);
// router.put("/member-workout/:id",                  updateWorkout);
// router.put("/member-workout/:id/day/:dayId",       updateWorkoutDay);
// router.delete("/member-workout/:id",               deleteWorkout);

router.post("/reg-workout-plans",              createRegWorkoutPlan);
router.get("/reg-workout-plans",               getAllRegWorkoutPlans);
router.get("/reg-workout-plans/member/:id",    getRegWorkoutPlanByMember);
router.put("/reg-workout-plans/:id",           updateRegWorkoutPlan);
router.delete("/reg-workout-plans/:id",        deleteRegWorkoutPlan);

// ── Attendance ────────────────────────────────────────────────────────────────
router.post("/xls-attendance/import",     importAttendance);
router.get("/xls-attendance",             getAllAttendance);
router.get("/xls-attendance/months",      getAvailableMonths);
router.get("/xls-attendance/member/:id",  getAttendanceByRegistration);
router.post("/xls-attendance/link",       linkAttendanceId);

// ── Leads ─────────────────────────────────────────────────────────────────────
router.post("/leads",      createLead);
router.get("/leads/stats", getLeadStats);
router.get("/leads",       getAllLeads);
router.put("/leads/:id",   updateLead);
router.delete("/leads/:id",deleteLead);

// ── Email ─────────────────────────────────────────────────────────────────────
router.post("/send-email", sendInvoiceEmail);




export default router;