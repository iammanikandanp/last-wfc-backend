import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    amount:      { type: Number, required: true, min: 0 },
    category:    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer", "cheque", "other"],
      default: "cash",
    },
    date:        { type: Date, required: true, default: Date.now },
    receiptUrl:  { type: String, default: "" }, // Cloudinary URL
    receiptPublicId: { type: String, default: "" },
    vendor:      { type: String, default: "" }, // supplier / shop name
    notes:       { type: String, default: "" },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Index for period queries
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
