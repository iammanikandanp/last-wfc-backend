import { RegWorkoutPlan } from "../models/WorkoutPlan.js";
import { Registration }   from "../models/registration.js";

// ── Create / Upsert ───────────────────────────────────────────────────────────
export const createRegWorkoutPlan = async (req, res) => {
  try {
    const { registrationId, ...rest } = req.body;
    if (!registrationId) return res.status(400).json({ success: false, message: "registrationId is required" });

    const member = await Registration.findById(registrationId);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    // Deactivate previous active plan
    await RegWorkoutPlan.updateMany({ registrationId, isActive: true }, { isActive: false });

    const plan = new RegWorkoutPlan({
      registrationId,
      memberName:  member.name,
      memberPhone: member.phone,
      ...rest,
      isActive: true,
    });

    await plan.save();
    return res.status(201).json({ success: true, message: "Workout plan saved", plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All ───────────────────────────────────────────────────────────────────
export const getAllRegWorkoutPlans = async (req, res) => {
  try {
    const plans = await RegWorkoutPlan.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: plans.length, plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get by Member ─────────────────────────────────────────────────────────────
export const getRegWorkoutPlanByMember = async (req, res) => {
  try {
    const plan = await RegWorkoutPlan.findOne({ registrationId: req.params.id, isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: "No active workout plan" });
    return res.status(200).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateRegWorkoutPlan = async (req, res) => {
  try {
    const plan = await RegWorkoutPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, message: "Updated", plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete (soft) ─────────────────────────────────────────────────────────────
export const deleteRegWorkoutPlan = async (req, res) => {
  try {
    await RegWorkoutPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Plan deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};