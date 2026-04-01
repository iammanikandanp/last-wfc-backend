import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema({
  name:     { type: String },          // e.g. "Bench Press"
  sets:     { type: Number, default: 0 },
  reps:     { type: String },          // e.g. "10-12" or "15"
  duration: { type: String },          // e.g. "30 sec"
  rest:     { type: String },          // e.g. "60 sec"
  calories: { type: Number, default: 0 },
  notes:    { type: String, default: "" },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  exercises: [exerciseSchema],
  totalCalories: { type: Number, default: 0 },
  notes: { type: String, default: "" },
}, { _id: false });

const daySchema = new mongoose.Schema({
  morning: { type: sessionSchema, default: {} },
  evening: { type: sessionSchema, default: {} },
}, { _id: false });

const regWorkoutPlanSchema = new mongoose.Schema({
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Registra",
    required: true,
  },
  memberName:  { type: String },
  memberPhone: { type: String },

  goal: {
    type: String,
    enum: ["Weight Loss", "Muscle Gain", "Strength", "Endurance", "Flexibility", "Custom"],
    default: "Muscle Gain",
  },

  // Monday to Saturday
  monday:    { type: daySchema, default: {} },
  tuesday:   { type: daySchema, default: {} },
  wednesday: { type: daySchema, default: {} },
  thursday:  { type: daySchema, default: {} },
  friday:    { type: daySchema, default: {} },
  saturday:  { type: daySchema, default: {} },

  totalWeeklyCalories: { type: Number, default: 0 },
  notes:    { type: String, default: "" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const RegWorkoutPlan = mongoose.model("RegWorkoutPlan", regWorkoutPlanSchema);