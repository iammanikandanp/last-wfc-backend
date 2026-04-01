import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Guest Plan", "Basic Plan", "Standard Plan", "Premium Plan"],
    },
    duration: {
      type: Number,
      required: true, // in days
    },
    price: {
      type: Number,
      required: true,
    },
    description: String,
    features: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Plan = mongoose.model("Plan", planSchema);
