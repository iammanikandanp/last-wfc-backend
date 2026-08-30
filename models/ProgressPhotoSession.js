import mongoose from "mongoose";

const progressPhotoSessionSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "Registra", required: true },
    date: { type: Date, default: Date.now },
    frontImage: { type: String, default: "" },
    sideImage: { type: String, default: "" },
    backImage: { type: String, default: "" },
    notes: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

progressPhotoSessionSchema.index({ registration: 1, date: -1 });

export const ProgressPhotoSession = mongoose.model("ProgressPhotoSession", progressPhotoSessionSchema);
