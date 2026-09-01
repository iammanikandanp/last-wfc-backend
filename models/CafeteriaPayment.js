import mongoose from "mongoose";

const cafeteriaPaymentSchema = new mongoose.Schema(
  {
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaTransaction", required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["Cash", "GPay"], required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const CafeteriaPayment = mongoose.model("CafeteriaPayment", cafeteriaPaymentSchema);
