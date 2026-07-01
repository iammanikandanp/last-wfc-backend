import mongoose from "mongoose";

const blockListSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registra",
    },
    memberName:  { type: String, required: true },
    memberPhone: { type: String, required: true },
    reason:      { type: String, default: "" },
    blockedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const BlockList = mongoose.model("BlockList", blockListSchema);
