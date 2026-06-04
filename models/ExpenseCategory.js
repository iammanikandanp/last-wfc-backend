import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    color:       { type: String, default: "#6366f1" }, // hex color for UI
    icon:        { type: String, default: "tag" },     // lucide icon name
    isActive:    { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ExpenseCategory = mongoose.model("ExpenseCategory", expenseCategorySchema);
