import { XlsAttendance } from "../models/XlsAttendance.js";
import { Registration } from "../models/registration.js";

// ── Bulk Import attendance records from parsed XLS ────────────────────────────
// Payload: { month: "2025-09", sourceFile: "255Month-25-09.XLS", records: [...] }
export const importAttendance = async (req, res) => {
  try {
    const { month, sourceFile, records } = req.body;

    if (!month || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "month and records[] required" });
    }

    // Fetch all registrations to match by attendanceId
    const allRegs = await Registration.find({}, { _id: 1, attendanceId: 1, name: 1 });
    const regByAttId = {};
    allRegs.forEach(r => {
      if (r.attendanceId) regByAttId[String(r.attendanceId)] = r._id;
    });

    let inserted = 0, updated = 0, unmatched = 0;

    for (const rec of records) {
      const attId = String(rec.id);
      const regId = regByAttId[attId] || null;
      if (!regId) unmatched++;

      const doc = {
        attendanceId: attId,
        registrationId: regId,
        name:       rec.name,
        dept:       rec.dept,
        shift:      rec.shift,
        month,
        workDays:   rec.workDays   || 0,
        attendDays: rec.attendDays || 0,
        absentDays: rec.absentDays || 0,
        lateMins:   rec.lateMins   || 0,
        lateTimes:  rec.lateTimes  || 0,
        earlyMins:  rec.earlyMins  || 0,
        earlyTimes: rec.earlyTimes || 0,
        otHours:    rec.otHours    || 0,
        sourceFile: sourceFile || "",
      };

      // Upsert: update if same attendanceId+month already exists
      const result = await XlsAttendance.findOneAndUpdate(
        { attendanceId: attId, month },
        doc,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result) inserted++;
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${inserted} records for ${month}. ${unmatched} unmatched (no attendanceId set in Registration).`,
      inserted,
      unmatched,
      month,
    });
  } catch (err) {
    console.error("importAttendance error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get all attendance records ────────────────────────────────────────────────
export const getAllAttendance = async (req, res) => {
  try {
    const { month, dept, attendanceId } = req.query;
    const filter = {};
    if (month)       filter.month       = month;
    if (dept)        filter.dept        = dept;
    if (attendanceId) filter.attendanceId = String(attendanceId);

    const records = await XlsAttendance.find(filter)
      .populate("registrationId", "name phone emails images")
      .sort({ month: -1, dept: 1, name: 1 });

    return res.status(200).json({ success: true, count: records.length, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get attendance for one registration member ────────────────────────────────
export const getAttendanceByRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id, { attendanceId: 1 });
    if (!reg?.attendanceId) {
      return res.status(200).json({ success: true, records: [] });
    }

    const records = await XlsAttendance.find({ attendanceId: String(reg.attendanceId) })
      .sort({ month: -1 });
    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get available months ──────────────────────────────────────────────────────
export const getAvailableMonths = async (req, res) => {
  try {
    const months = await XlsAttendance.distinct("month");
    return res.status(200).json({ success: true, months: months.sort().reverse() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete all attendance records ────────────────────────────────────────────
export const deleteAllAttendance = async (req, res) => {
  try {
    const result = await XlsAttendance.deleteMany({});
    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Link a Registration to an attendanceId (set attendanceId on Registration) ──
export const linkAttendanceId = async (req, res) => {
  try {
    const { registrationId, attendanceId } = req.body;
    if (!registrationId || !attendanceId) {
      return res.status(400).json({ success: false, message: "registrationId and attendanceId required" });
    }

    // Unlink records from the old attendanceId before re-linking
    const oldReg = await Registration.findById(registrationId, { attendanceId: 1 });
    if (oldReg?.attendanceId && String(oldReg.attendanceId) !== String(attendanceId)) {
      await XlsAttendance.updateMany(
        { attendanceId: String(oldReg.attendanceId), registrationId },
        { registrationId: null }
      );
    }

    // Set attendanceId on Registration
    await Registration.findByIdAndUpdate(registrationId, { attendanceId: String(attendanceId) });

    // Link all existing XlsAttendance records for this attendanceId
    const updated = await XlsAttendance.updateMany(
      { attendanceId: String(attendanceId) },
      { registrationId }
    );

    return res.status(200).json({
      success: true,
      message: `Linked. Updated ${updated.modifiedCount} attendance records.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};