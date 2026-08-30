import mongoose from "mongoose";

const cafeteriaStockSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true, unique: true },
    unit:     { type: String, default: "pcs", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    costPerUnit: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const CafeteriaStock = mongoose.model("CafeteriaStock", cafeteriaStockSchema);
