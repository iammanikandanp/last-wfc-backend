import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    amount:      { type: Number, required: true, min: 0 },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: "IncomeCategory", required: true },
    type:        { type: String, enum: ["income", "loss"], default: "income" },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer", "cheque", "other"],
      default: "cash",
    },
    date:      { type: Date, required: true, default: Date.now },
    notes:     { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

incomeSchema.index({ date: -1 });
incomeSchema.index({ category: 1, date: -1 });

export const Income = mongoose.model("Income", incomeSchema);
