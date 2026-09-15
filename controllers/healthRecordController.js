import { HealthRecord } from "../models/HealthRecord.js";
import { Registration } from "../models/registration.js";

// ── POST /api/v1/health-records ──────────────────────────────────────────────
export const createHealthRecord = async (req, res) => {
  try {
    const { registrationId, bloodPressure, sugarLevel, date, time } = req.body;
    if (!registrationId) return res.status(400).json({ success: false, message: 'registrationId is required' });

    // Parse BP "120/80" into systolic/diastolic when possible
    let systolic, diastolic;
    if (bloodPressure && typeof bloodPressure === 'string') {
      const m = bloodPressure.match(/(\d{2,3})\s*\/?\s*(\d{2,3})?/);
      if (m) { systolic = Number(m[1]); diastolic = m[2] ? Number(m[2]) : undefined; }
    }

    // Idempotency check: prevent duplicate submissions within 5 seconds
    const recent = await HealthRecord.findOne({
      registration: registrationId,
      createdAt: { $gte: new Date(Date.now() - 5000) }
    });
    if (recent && recent.bloodPressure === bloodPressure && recent.sugarLevel == sugarLevel) {
      return res.status(200).json({ success: true, data: recent, message: "Duplicate prevented" });
    }

    const rec = await HealthRecord.create({
      registration: registrationId,
      bloodPressure: bloodPressure || undefined,
      systolic,
      diastolic,
      sugarLevel: sugarLevel !== undefined && sugarLevel !== '' ? Number(sugarLevel) : undefined,
      date: date ? new Date(date) : new Date(),
      time: time || (new Date()).toTimeString().slice(0,5),
      recordedBy: req.user?._id,
    });

    // Update latest values on Registration for quick display (do not delete history)
    await Registration.findByIdAndUpdate(registrationId, {
      ...(bloodPressure ? { bloodPressure } : {}),
      ...(sugarLevel !== undefined && sugarLevel !== '' ? { sugarLevel } : {}),
    });

    return res.status(201).json({ success: true, data: rec });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/health-records/member/:id ───────────────────────────────────
export const getHealthRecordsByMember = async (req, res) => {
  try {
    // Members can only access their own records
    if (req.user.role === 'member' && (!req.user.registrationId || req.user.registrationId.toString() !== req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const records = await HealthRecord.find({ registration: req.params.id }).sort({ date: 1 });
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Optional: latest single record
export const getLatestHealthRecordByMember = async (req, res) => {
  try {
    if (req.user.role === 'member' && (!req.user.registrationId || req.user.registrationId.toString() !== req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const rec = await HealthRecord.findOne({ registration: req.params.id }).sort({ date: -1 });
    return res.status(200).json({ success: true, data: rec });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/health-records/:id ──────────────────────────────────────
export const deleteHealthRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (record.isInitial) {
      return res.status(403).json({ success: false, message: 'Cannot delete the initial admission record.' });
    }
    const deleted = await HealthRecord.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
