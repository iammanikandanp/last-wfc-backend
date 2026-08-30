import mongoose from "mongoose";

const cafeteriaDailyRevenueSchema = new mongoose.Schema(
  {
    businessDate: { type: String, required: true }, // Format: YYYY-MM-DD
    source: { type: String, default: "Cafeteria" },
    description: { type: String, default: "Today Cafeteria" },
    totalCollectedAmount: { type: Number, required: true },
    incomeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "Income" },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate daily revenue processing
cafeteriaDailyRevenueSchema.index({ businessDate: 1, source: 1 }, { unique: true });

export const CafeteriaDailyRevenue = mongoose.model("CafeteriaDailyRevenue", cafeteriaDailyRevenueSchema);
