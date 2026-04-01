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
  issues: { type: String },
  description: { type: String, default: "" },

  profession: { type: String,   },
  phone: { type: String,   },
  password: { type: String },
  address: { type: String,   },
  pincode: { type: String,   },

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
