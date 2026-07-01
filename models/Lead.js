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
  status:       { type: String, default: "New" }, // free-text: base statuses + user-created custom categories
  followUpDate: { type: Date },
  assignedTo:   { type: String, default: "" },
  notes:        { type: String, default: "" },
  profileImage: { type: String, default: "" },
  referralName: { type: String, default: "" },
  referralPhone:{ type: String, default: "" },
}, { timestamps: true });

export const Lead = mongoose.model("Lead", leadSchema);