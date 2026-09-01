import mongoose from "mongoose";

const cafeteriaStockRefillSchema = new mongoose.Schema(
  {
    stock:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaStock", required: true },
    itemName: { type: String, required: true, trim: true }, // snapshot, survives item rename
    quantity: { type: Number, required: true, min: 1 },
    totalRefillAmount: { type: Number, required: true, min: 0 },
    expensePosted: { type: Boolean, default: false },
    source: { type: String, enum: ["initial", "refill"], default: "refill" },
    refilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cafeteriaStockRefillSchema.index({ stock: 1, createdAt: -1 });

export const CafeteriaStockRefill = mongoose.model("CafeteriaStockRefill", cafeteriaStockRefillSchema);
