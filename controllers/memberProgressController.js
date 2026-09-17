import { MemberProgress } from "../models/MemberProgress.js";

// ── POST /api/v1/member-progress ───────────────────────────────────────────────
export const createProgressRecord = async (req, res) => {
  try {
    const { registrationId, date, weight, height, waist, hip, neck, chest, arm, thigh, bodyFat, bmi, notes } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }

    const toNum = v => (v === undefined || v === null || v === "" ? undefined : Number(v));

    // Idempotency check: prevent duplicate submissions within 5 seconds
    const recent = await MemberProgress.findOne({
      registration: registrationId,
      createdAt: { $gte: new Date(Date.now() - 5000) }
    });
    if (recent && recent.weight == toNum(weight) && recent.bmi == toNum(bmi)) {
      return res.status(200).json({ success: true, data: recent, message: "Duplicate prevented" });
    }

    const record = await MemberProgress.create({
      registration: registrationId,
      date: date ? new Date(date) : new Date(),
      weight: toNum(weight), height: toNum(height), waist: toNum(waist), hip: toNum(hip),
      neck: toNum(neck), chest: toNum(chest), arm: toNum(arm), thigh: toNum(thigh),
      bodyFat: toNum(bodyFat), bmi: toNum(bmi),
      notes: notes || "",
      recordedBy: req.user._id,
    });

    // Determine true latest values based on chronological date
    const latestRecord = await MemberProgress.findOne({ registration: registrationId }).sort({ date: -1, createdAt: -1 });
    if (latestRecord) {
      const { Registration } = await import("../models/registration.js");
      await Registration.findByIdAndUpdate(registrationId, {
        ...(latestRecord.weight ? { weight: latestRecord.weight } : {}),
        ...(latestRecord.height ? { height: latestRecord.height } : {}),
        ...(latestRecord.waist ? { waist: latestRecord.waist } : {}),
        ...(latestRecord.hip ? { hip: latestRecord.hip } : {}),
        ...(latestRecord.neck ? { neck: latestRecord.neck } : {}),
        ...(latestRecord.bodyFat ? { bodyFat: latestRecord.bodyFat } : {}),
        ...(latestRecord.bmi ? { bmi: latestRecord.bmi } : {}),
      });
    }

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

// ── DELETE /api/v1/member-progress/:id ──────────────────────────────────────
export const deleteProgressRecord = async (req, res) => {
  try {
    const record = await MemberProgress.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    if (record.isInitial) {
      return res.status(403).json({ success: false, message: "Cannot delete the initial admission record." });
    }
    const deleted = await MemberProgress.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
