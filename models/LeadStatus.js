import mongoose from "mongoose";

const leadStatusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

export const LeadStatus = mongoose.model("LeadStatus", leadStatusSchema);
