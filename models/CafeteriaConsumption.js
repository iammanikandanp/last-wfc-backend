import mongoose from "mongoose";

const cafeteriaConsumptionSchema = new mongoose.Schema(
  {
    stock:      { type: mongoose.Schema.Types.ObjectId, ref: "CafeteriaStock", required: true },
    itemName:   { type: String, required: true, trim: true }, // snapshot, survives item rename
    member:     { type: mongoose.Schema.Types.ObjectId, ref: "Registra", required: true },
    memberName: { type: String, required: true, trim: true }, // snapshot, survives member edits
    quantity:   { type: Number, required: true, min: 1 },
    amount:     { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["Paid", "Unpaid", "Not Paid"], default: "Unpaid" },
    paymentDate:   { type: Date },
    recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cafeteriaConsumptionSchema.index({ createdAt: -1 });

export const CafeteriaConsumption = mongoose.model("CafeteriaConsumption", cafeteriaConsumptionSchema);
