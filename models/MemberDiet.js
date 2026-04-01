// models/MemberDiet.js
import mongoose from "mongoose";

const dietDaySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    required: true,
  },
  morning:     { type: String, default: "" },
  afternoon:   { type: String, default: "" },
  evening:     { type: String, default: "" },
  night:       { type: String, default: "" },
  preWorkout:  { type: String, default: "" },
  postWorkout: { type: String, default: "" },
  food:        { type: String, default: "" },  // comma-separated food items
  calories:    { type: Number, default: 0 },
  weightLoss:  { type: String, default: "no" }, // yes/no
  weightGain:  { type: String, default: "no" }, // yes/no
}, { _id: true });

const memberDietSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registra",
      required: true,
    },
    memberName:  { type: String },
    memberPhone: { type: String },
    planName:    { type: String, default: "Diet Plan" },
    days:        [dietDaySchema],
    isActive:    { type: Boolean, default: true },
    importedFrom:{ type: String, default: "csv" }, // csv | manual
    notes:       { type: String, default: "" },
  },
  { timestamps: true }
);

// One active diet plan per member at a time
memberDietSchema.index({ registrationId: 1, isActive: 1 });

export const MemberDiet = mongoose.model("MemberDiet", memberDietSchema);