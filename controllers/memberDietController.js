// controllers/memberDietController.js
import { MemberDiet } from "../models/MemberDiet.js";
import { Registration } from "../models/registration.js";
import {
  parseCSVText,
  validateHeaders,
  normalizeDay,
  DIET_REQUIRED_HEADERS,
} from "../utils/csvParser.js";

/* ─── Import Diet CSV ─────────────────────────────────────────────────────── */
export const importDietCSV = async (req, res) => {
  try {
    const { registrationId, planName } = req.body;
    console.log("importDietCSV called with registrationId:", registrationId, "planName:", planName);

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
    const { valid, missing } = validateHeaders(headers, DIET_REQUIRED_HEADERS);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid CSV format. Missing required headers: ${missing.join(", ")}`,
        hint: "Required: day | Optional: morning, afternoon, evening, night, preWorkout, postWorkout, food, calories, weightLoss, weightGain",
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "CSV has no data rows" });
    }

    // Parse rows into diet day objects
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
        morning:     row.morning     || row.Morning     || "",
        afternoon:   row.afternoon   || row.Afternoon   || "",
        evening:     row.evening     || row.Evening     || "",
        night:       row.night       || row.Night       || "",
        preWorkout:  row.preworkout  || row.preWorkout  || row.pre_workout  || "",
        postWorkout: row.postworkout || row.postWorkout || row.post_workout || "",
        food:        row.food        || row.Food        || "",
        calories:    parseInt(row.calories || row.Calories || "0") || 0,
        weightLoss:  (row.weightloss || row.weightLoss  || "no").toLowerCase(),
        weightGain:  (row.weightgain || row.weightGain  || "no").toLowerCase(),
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
    await MemberDiet.updateMany({ registrationId, isActive: true }, { isActive: false });

    // Create new plan
    const diet = new MemberDiet({
      registrationId,
      memberName:   member.name,
      memberPhone:  member.phone,
      planName:     planName || "Diet Plan",
      days,
      isActive:     true,
      importedFrom: "csv",
    });

    await diet.save();

    return res.status(201).json({
      success: true,
      message: `Diet plan imported successfully (${days.length} days)`,
      diet,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("importDietCSV error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Get Diet by Member ──────────────────────────────────────────────────── */
export const getDietByMember = async (req, res) => {
  try {
    const diet = await MemberDiet.findOne({
      registrationId: req.params.memberId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!diet) {
      return res.status(404).json({ success: false, message: "No active diet plan found" });
    }

    return res.status(200).json({ success: true, diet });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Get All Diets by Member (history) ──────────────────────────────────── */
export const getAllDietsByMember = async (req, res) => {
  try {
    const diets = await MemberDiet.find({ registrationId: req.params.memberId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: diets.length, diets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Update entire Diet plan ─────────────────────────────────────────────── */
export const updateDiet = async (req, res) => {
  try {
    const diet = await MemberDiet.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!diet) return res.status(404).json({ success: false, message: "Diet plan not found" });
    return res.status(200).json({ success: true, message: "Diet updated successfully", diet });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Update a single day inside a diet plan ─────────────────────────────── */
export const updateDietDay = async (req, res) => {
  try {
    const { id, dayId } = req.params;
    const diet = await MemberDiet.findById(id);
    if (!diet) return res.status(404).json({ success: false, message: "Diet plan not found" });

    const dayEntry = diet.days.id(dayId);
    if (!dayEntry) return res.status(404).json({ success: false, message: "Day entry not found" });

    // Update only provided fields
    Object.assign(dayEntry, req.body);
    await diet.save();

    return res.status(200).json({ success: true, message: "Day updated successfully", diet });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Delete Diet plan ────────────────────────────────────────────────────── */
export const deleteDiet = async (req, res) => {
  try {
    await MemberDiet.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Diet plan deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};