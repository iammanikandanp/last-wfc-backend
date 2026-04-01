// models/MemberWorkout.js
import mongoose from "mongoose";

const workoutDaySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    required: true,
  },
  morning:   { type: String, default: "" },
  evening:   { type: String, default: "" },
  chest:     { type: String, default: "" },
  back:      { type: String, default: "" },
  biceps:    { type: String, default: "" },  // fixed spelling
  triceps:   { type: String, default: "" },  // fixed spelling
  legs:      { type: String, default: "" },
  shoulders: { type: String, default: "" },
  cardio:    { type: String, default: "" },
  count:     { type: Number, default: 0 },   // number of sets
  reps:      { type: Number, default: 0 },   // reps per set
}, { _id: true });

const memberWorkoutSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registra",
      required: true,
    },
    memberName:  { type: String },
    memberPhone: { type: String },
    planName:    { type: String, default: "Workout Plan" },
    days:        [workoutDaySchema],
    isActive:    { type: Boolean, default: true },
    importedFrom:{ type: String, default: "csv" },
    notes:       { type: String, default: "" },
  },
  { timestamps: true }
);

memberWorkoutSchema.index({ registrationId: 1, isActive: 1 });

export const MemberWorkout = mongoose.model("MemberWorkout", memberWorkoutSchema);