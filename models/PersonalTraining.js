import mongoose from "mongoose";

const personalTrainingSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
    },
    packageName: String,
    totalSessions: Number,
    completedSessions: {
      type: Number,
      default: 0,
    },
    remainingSessions: Number,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    sessions: [
      {
        date: Date,
        duration: Number, // in minutes
        focus: String, // e.g., "chest", "legs", "cardio"
        notes: String,
        completed: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export const PersonalTraining = mongoose.model(
  "PersonalTraining",
  personalTrainingSchema
);
