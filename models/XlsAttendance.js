import mongoose from "mongoose";

const xlsAttendanceSchema = new mongoose.Schema({
  // The numeric ID from the XLS file (e.g., 18 for AjayKumar)
  attendanceId: { type: String, required: true },

  // Linked to Registration model (populated if attendanceId matches)
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Registra",
    default: null,
  },

  // From the XLS
  name:       { type: String },
  dept:       { type: String }, // GYM, MrgClient, EveClient, GOLD, Ladies
  shift:      { type: String },
  month:      { type: String, required: true }, // e.g. "2025-09"

  // Monthly stats
  workDays:   { type: Number, default: 0 },
  attendDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  lateMins:   { type: Number, default: 0 },
  lateTimes:  { type: Number, default: 0 },
  earlyMins:  { type: Number, default: 0 },
  earlyTimes: { type: Number, default: 0 },
  otHours:    { type: Number, default: 0 },

  // Source file name
  sourceFile: { type: String, default: "" },
}, { timestamps: true });

// Unique per attendanceId + month (prevent duplicate imports)
xlsAttendanceSchema.index({ attendanceId: 1, month: 1 }, { unique: true });

export const XlsAttendance = mongoose.model("XlsAttendance", xlsAttendanceSchema);