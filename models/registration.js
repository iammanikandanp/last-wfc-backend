import mongoose from "mongoose";

const registerSchema = new mongoose.Schema({
  name: { type: String,  },
  age: { type: Number, },
  gender: { type: String,  },
  emails: { type: String, },

  height: { type: Number,  },
  weight: { type: Number,   },
  startDate: { type: Date,   },
endDate: { type: Date,   },

 bodyFat:{type: String },
  bmi: { type: String }, 
  hip: { type: String }, 
  neck: { type: String }, 
  waist: { type: String }, 
  bloodPressure: { type: String }, 
  sugarLevel: { type: String }, 
images: {
    profileImage: String,
    frontBodyImage: String,
    sideBodyImage: String,
    backBodyImage: String,
  },
  bloodGroup: { type: String,   },
  statusLevel: { type: String,   },
  status: { type: String, enum: ["pending","active","expiring","expired","blocked","hold"], default: "active" },
  isTop10: { type: Boolean, default: false },
  goal: { type: String, default: "" },
  issues: { type: String },
  description: { type: String, default: "" },

  // Hold / Freeze Membership
  isOnHold: { type: Boolean, default: false },
  holdStartDate: { type: Date },
  scheduledResumeDate: { type: Date },
  actualHoldEndDate: { type: Date },
  holdReason: { type: String, default: "" },
  frozenRemainingDays: { type: Number, default: 0 },
  originalEndDateBeforeHold: { type: Date },
  holdHistory: [
    {
      holdStartDate: { type: Date },
      scheduledResumeDate: { type: Date },
      actualHoldEndDate: { type: Date },
      daysHeld: { type: Number },
      frozenRemainingDays: { type: Number },
      reason: { type: String, default: "" },
      newEndDate: { type: Date },
      status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
      heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      unheldBy: { type: mongoose.Schema.Types.Mixed },
      heldAt: { type: Date, default: Date.now },
      unheldAt: { type: Date },
    },
  ],

  profession: { type: String,   },
  phone: { type: String,   },
  password: { type: String },
  address: { type: String,   },
  pincode: { type: String,   },
  dateOfBirth: { type: String }, // Store actual DOB


  packages: { type: String,   },
  duration: { type: String,   },
  services: { type: String,   },

  personalTraining: { type: String, default: "" },
  customWorkout: { type: String, default: "" },
  customDiet: { type: String, default: "" },
  rehabTherapy: { type: String, default: "" },
  attendanceId: { type: String, default: "" },

},{ timestamps: true });

export const Registration = mongoose.model("Registra", registerSchema);
