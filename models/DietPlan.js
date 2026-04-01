import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  items:    [{ type: String }],
  calories: { type: Number, default: 0 },
  time:     { type: String },
  notes:    { type: String, default: "" },
}, { _id: false });

const regDietPlanSchema = new mongoose.Schema({
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Registra",
    required: true,
  },
  memberName:  { type: String },
  memberPhone: { type: String },

  // Goal & targets
  goal: {
    type: String,
    enum: ["Weight Loss", "Muscle Gain", "Maintenance", "Endurance", "Custom"],
    default: "Maintenance",
  },
  calorieTarget: { type: Number, default: 2000 },
  weightGoal:    { type: Number },        // kg
  waterIntake:   { type: Number, default: 3 }, // litres/day

  // Meals
  breakfast: { type: mealSchema, default: {} },
  morningSnack: { type: mealSchema, default: {} },
  lunch:     { type: mealSchema, default: {} },
  eveningSnack: { type: mealSchema, default: {} },
  dinner:    { type: mealSchema, default: {} },

  // Macros (grams/day)
  protein: { type: Number, default: 0 },
  carbs:   { type: Number, default: 0 },
  fats:    { type: Number, default: 0 },
  fiber:   { type: Number, default: 0 },

  // Supplements
  supplements: [{ type: String }],

  notes:    { type: String, default: "" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const RegDietPlan = mongoose.model("RegDietPlan", regDietPlanSchema);