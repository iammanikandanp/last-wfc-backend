import { MemberProgress } from "../models/MemberProgress.js";

// ── POST /api/v1/member-progress ───────────────────────────────────────────────
export const createProgressRecord = async (req, res) => {
  try {
    const { registrationId, date, weight, height, waist, hip, neck, chest, arm, thigh, bodyFat, bmi, notes } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }

    const toNum = v => (v === undefined || v === null || v === "" ? undefined : Number(v));

    const record = await MemberProgress.create({
      registration: registrationId,
      date: date ? new Date(date) : new Date(),
      weight: toNum(weight), height: toNum(height), waist: toNum(waist), hip: toNum(hip),
      neck: toNum(neck), chest: toNum(chest), arm: toNum(arm), thigh: toNum(thigh),
      bodyFat: toNum(bodyFat), bmi: toNum(bmi),
      notes: notes || "",
      recordedBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/member-progress/member/:id ──────────────────────────────────────
export const getProgressByMember = async (req, res) => {
  try {
    if (
      req.user.role === "member" &&
      (!req.user.registrationId || req.user.registrationId.toString() !== req.params.id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const records = await MemberProgress.find({ registration: req.params.id }).sort({ date: 1 });

    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
