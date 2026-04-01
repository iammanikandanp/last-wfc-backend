import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  phone:        { type: String, required: true },
  email:        { type: String, default: "" },
  age:          { type: Number },
  gender:       { type: String, enum: ["Male","Female","Other",""], default: "" },
  interest:     { type: String, default: "" },
  source:       { type: String, default: "Walk-in" },
  message:      { type: String, default: "" },
  status:       { type: String, enum: ["New","Contacted","Interested","Converted","Lost"], default: "New" },
  followUpDate: { type: Date },
  assignedTo:   { type: String, default: "" },
  notes:        { type: String, default: "" },
}, { timestamps: true });

export const Lead = mongoose.model("Lead", leadSchema);