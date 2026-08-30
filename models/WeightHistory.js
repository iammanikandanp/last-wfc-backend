import mongoose from "mongoose";

const weightHistorySchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registra",
      required: true,
    },
    memberName: { type: String, default: "" },
    weight: { type: Number, required: true },
    recordDate: { type: Date, default: Date.now },
    recordTime: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recordType: { type: String, enum: ["initial", "update"], default: "update" },
  },
  { timestamps: true }
);

weightHistorySchema.index({ registrationId: 1, recordDate: 1, recordTime: 1 });

export const WeightHistory = mongoose.model("WeightHistory", weightHistorySchema);
