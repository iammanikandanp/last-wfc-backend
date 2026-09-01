import mongoose from "mongoose";

const cafeteriaTransactionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Registra", required: true },
    memberName: { type: String, required: true, trim: true },
    // Legacy fields (kept for backward compatibility, now optional)
    item: { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaStock" },
    itemName: { type: String, trim: true },
    quantity: { type: Number, min: 1 },
    itemAmount: { type: Number, min: 0 },

    // New structure: Array of items for a single transaction
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaStock", required: true },
        itemName: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        amount: { type: Number, required: true, min: 0 },
      }
    ],
    extraAmount: { type: Number, required: true, min: 0, default: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["Paid", "Unpaid"], required: true },
    paymentMode: { type: String, enum: ["Cash", "GPay"] },
    transactionDate: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cafeteriaTransactionSchema.index({ transactionDate: -1 });

export const CafeteriaTransaction = mongoose.model("CafeteriaTransaction", cafeteriaTransactionSchema);
