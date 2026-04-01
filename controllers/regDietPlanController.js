import { RegDietPlan } from "../models/DietPlan.js";
import { Registration } from "../models/registration.js";

// ── Create / Upsert Diet Plan ─────────────────────────────────────────────────
export const createRegDietPlan = async (req, res) => {
  try {
    const { registrationId, ...rest } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }

    const member = await Registration.findById(registrationId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    // Deactivate any previous active plan for this member
    await RegDietPlan.updateMany({ registrationId, isActive: true }, { isActive: false });

    const plan = new RegDietPlan({
      registrationId,
      memberName:  member.name,
      memberPhone: member.phone,
      ...rest,
      isActive: true,
    });

    await plan.save();

    return res.status(201).json({ success: true, message: "Diet plan saved successfully", plan });
  } catch (err) {
    console.error("createRegDietPlan error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Plans ─────────────────────────────────────────────────────────────
export const getAllRegDietPlans = async (req, res) => {
  try {
    const plans = await RegDietPlan.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: plans.length, plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Plan by Member ────────────────────────────────────────────────────────
export const getRegDietPlanByMember = async (req, res) => {
  try {
    const plan = await RegDietPlan.findOne({
      registrationId: req.params.id,
      isActive: true,
    });
    if (!plan) return res.status(404).json({ success: false, message: "No active diet plan" });
    return res.status(200).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Plan ───────────────────────────────────────────────────────────────
export const updateRegDietPlan = async (req, res) => {
  try {
    const plan = await RegDietPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, message: "Updated successfully", plan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Plan ───────────────────────────────────────────────────────────────
export const deleteRegDietPlan = async (req, res) => {
  try {
    await RegDietPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Plan deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};