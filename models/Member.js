import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Basic Information
    dateOfBirth: Date,
    emergencyContact: String,
    emergencyContactPhone: String,
    medicalConditions: String,

    // Body Measurements
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    height: Number, // cm
    weight: Number, // kg
    waist: Number, // cm
    hip: Number, // cm
    chest: Number, // cm
    arm: Number, // cm
    thigh: Number, // cm

    // Auto Calculated
    bmi: Number,
    waistHipRatio: Number,
    fitnessCategory: {
      type: String,
      enum: ["Underweight", "Normal", "Overweight", "Obese"],
    },

    // Progress Photos
    progressPhotos: [
      {
        type: {
          type: String,
          enum: ["front", "side", "back"],
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Address Details
    profession: String,
    address: String,
    city: String,
    state: String,
    pincode: String,

    // Membership Details
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    startDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "suspended"],
      default: "active",
    },

    // Additional Services
    personalTraining: Boolean,
    customWorkout: Boolean,
    customDiet: Boolean,
    rehabTherapy: Boolean,

    // Financial
    totalPaid: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },

    // Flag for overdue
    isOverdue: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Member = mongoose.model("Member", memberSchema);
