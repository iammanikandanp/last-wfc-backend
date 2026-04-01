import mongoose from "mongoose";

const regPaymentSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registra",
      required: true,
    },
    memberName:  { type: String, required: true },
    memberPhone: { type: String },
    memberEmail: { type: String },
    package:     { type: String, required: true },
    amount:      { type: Number, required: true },
    discount:    { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },
    invoiceNo:   { type: String, unique: true },
    startDate:   { type: Date },
    endDate:     { type: Date },
    pdfUrl:        { type: String, default: "" }, // Cloudinary PDF URL
    paymentType:   { type: String, enum: ["full", "partly"], default: "full" },
    advanceAmount: { type: Number, default: 0 },  // amount paid now
    balanceAmount: { type: Number, default: 0 },  // remaining due
    transactionId: { type: String },
  },
  { timestamps: true }
);

export const RegPayment = mongoose.model("RegPayment", regPaymentSchema);