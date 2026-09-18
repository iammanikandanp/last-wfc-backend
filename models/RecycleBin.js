import mongoose from "mongoose";

const recycleBinSchema = new mongoose.Schema(
  {
    originalCollection: { type: String, required: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: Object, required: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index to automatically delete documents when expiresAt is reached
recycleBinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RecycleBin = mongoose.model("RecycleBin", recycleBinSchema);
