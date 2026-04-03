// controllers/memberWorkoutController.js
import { MemberWorkout } from "../models/MemberWorkout.js";
import { Registration } from "../models/registration.js";
import {
  parseCSVText,
  validateHeaders,
  normalizeDay,
  WORKOUT_REQUIRED_HEADERS,
} from "../utils/csvParser.js";

/* ─── Import Workout CSV ─────────────────────────────────────────────────── */
export const importWorkoutCSV = async (req, res) => {
  try {
    const { registrationId, planName } = req.body;
    console.log("importWorkoutCSV called with registrationId:", registrationId, "planName:", planName);

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "CSV file is required" });
    }

    // Fetch member
    const member = await Registration.findById(registrationId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    // Parse CSV from buffer
    const csvText = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCSVText(csvText);

    // Validate required headers
    const { valid, missing } = validateHeaders(headers, WORKOUT_REQUIRED_HEADERS);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid CSV format. Missing required headers: ${missing.join(", ")}`,
        hint: "Required: day | Optional: morning, evening, chest, back, biceps, triceps, legs, shoulders, cardio, count, reps",
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "CSV has no data rows" });
    }

    // Parse rows into workout day objects
    const days = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const day = normalizeDay(row.day || row.Day);
      if (!day) {
        errors.push(`Row ${idx + 2}: Invalid day "${row.day}" — must be Monday–Saturday`);
        return;
      }
      days.push({
        day,
        morning:   row.morning   || row.Morning   || "",
        evening:   row.evening   || row.Evening   || "",
        chest:     row.chest     || row.Chest     || "",
        back:      row.back      || row.Back      || "",
        biceps:    row.biceps    || row.Biceps    || "",
        triceps:   row.triceps   || row.Triceps   || "",
        legs:      row.legs      || row.Legs      || "",
        shoulders: row.shoulders || row.Shoulders || "",
        cardio:    row.cardio    || row.Cardio    || "",
        count:     parseInt(row.count || row.Count || "0") || 0,
        reps:      parseInt(row.reps  || row.Reps  || "0") || 0,
      });
    });

    if (days.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid day rows found in CSV",
        errors,
      });
    }

    // Deactivate existing plans for this member
    await MemberWorkout.updateMany({ registrationId, isActive: true }, { isActive: false });

    // Create new plan
    const workout = new MemberWorkout({
      registrationId,
      memberName:   member.name,
      memberPhone:  member.phone,
      planName:     planName || "Workout Plan",
      days,
      isActive:     true,
      importedFrom: "csv",
    });

    await workout.save();

    return res.status(201).json({
      success: true,
      message: `Workout plan imported successfully (${days.length} days)`,
      workout,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("importWorkoutCSV error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Get Workout by Member ───────────────────────────────────────────────── */
export const getWorkoutByMember = async (req, res) => {
  try {
    const workout = await MemberWorkout.findOne({
      registrationId: req.params.memberId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!workout) {
      return res.status(404).json({ success: false, message: "No active workout plan found" });
    }

    return res.status(200).json({ success: true, workout });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Get All Workouts by Member (history) ────────────────────────────────── */
export const getAllWorkoutsByMember = async (req, res) => {
  try {
    const workouts = await MemberWorkout.find({ registrationId: req.params.memberId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: workouts.length, workouts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Update entire Workout plan ──────────────────────────────────────────── */
export const updateWorkout = async (req, res) => {
  try {
    const workout = await MemberWorkout.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!workout) return res.status(404).json({ success: false, message: "Workout plan not found" });
    return res.status(200).json({ success: true, message: "Workout updated successfully", workout });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Update a single day inside a workout plan ───────────────────────────── */
export const updateWorkoutDay = async (req, res) => {
  try {
    const { id, dayId } = req.params;
    const workout = await MemberWorkout.findById(id);
    if (!workout) return res.status(404).json({ success: false, message: "Workout plan not found" });

    const dayEntry = workout.days.id(dayId);
    if (!dayEntry) return res.status(404).json({ success: false, message: "Day entry not found" });

    // Update only provided fields
    Object.assign(dayEntry, req.body);
    await workout.save();

    return res.status(200).json({ success: true, message: "Day updated successfully", workout });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Delete Workout plan ─────────────────────────────────────────────────── */
export const deleteWorkout = async (req, res) => {
  try {
    await MemberWorkout.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Workout plan deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};