import mongoose from "mongoose";

const healthRecordSchema = new mongoose.Schema({
  registration: { type: mongoose.Schema.Types.ObjectId, ref: "Registra", required: true },
  bloodPressure: { type: String },
  systolic: { type: Number },
  diastolic: { type: Number },
  sugarLevel: { type: Number },
  date: { type: Date, default: Date.now },
  time: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

healthRecordSchema.index({ registration: 1, date: 1 });

export const HealthRecord = mongoose.model("HealthRecord", healthRecordSchema);
