import mongoose from "mongoose";

const memberProgressSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "Registra", required: true },
    date:   { type: Date, default: Date.now },
    weight: Number,
    height: Number,
    waist:  Number,
    hip:    Number,
    neck:   Number,
    chest:  Number,
    arm:    Number,
    thigh:  Number,
    bodyFat: Number,
    bmi:     Number,
    notes:  { type: String, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

memberProgressSchema.index({ registration: 1, date: 1 });

export const MemberProgress = mongoose.model("MemberProgress", memberProgressSchema);
