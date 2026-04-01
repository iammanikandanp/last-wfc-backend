import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    specialization: [String],
    certification: [String],
    yearsOfExperience: Number,
    bio: String,
    profilePicture: String,
    hourlyRate: Number,
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Trainer = mongoose.model("Trainer", trainerSchema);
