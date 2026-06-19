import mongoose from "mongoose";

const incomeCategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    color:       { type: String, default: "#10b981" },
    isActive:    { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const IncomeCategory = mongoose.model("IncomeCategory", incomeCategorySchema);
