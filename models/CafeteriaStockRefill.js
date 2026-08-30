import mongoose from "mongoose";

const cafeteriaStockRefillSchema = new mongoose.Schema(
  {
    stock:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaStock", required: true },
    itemName: { type: String, required: true, trim: true }, // snapshot, survives item rename
    quantity: { type: Number, required: true, min: 1 },
    unitCost:  { type: Number, default: 0, min: 0 },  // price/unit at the time of this purchase
    totalCost: { type: Number, default: 0, min: 0 },  // quantity * unitCost, snapshotted
    source: { type: String, enum: ["initial", "refill"], default: "refill" },
    refilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cafeteriaStockRefillSchema.index({ stock: 1, createdAt: -1 });

export const CafeteriaStockRefill = mongoose.model("CafeteriaStockRefill", cafeteriaStockRefillSchema);
