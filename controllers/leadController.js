import { Lead } from "../models/Lead.js";
import { LeadStatus } from "../models/LeadStatus.js";

export const createLead = async (req, res) => {
  try {
    const profileImage = req.file?.path || req.body.profileImage || "";
    const lead = new Lead({ ...req.body, profileImage });
    await lead.save();
    return res.status(201).json({ success: true, message: "Lead added", lead });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateLead = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file?.path) data.profileImage = req.file.path;
    const lead = await Lead.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    return res.status(200).json({ success: true, lead });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    return res.status(200).json({ success: true, message: "Lead deleted" });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const getLeadStatuses = async (req, res) => {
  try {
    const statuses = await LeadStatus.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, statuses: statuses.map(s => s.name) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const createLeadStatus = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Status name is required" });
    const existing = await LeadStatus.findOne({ name });
    if (existing) return res.status(200).json({ success: true, message: "Status already exists" });
    await LeadStatus.create({ name });
    return res.status(201).json({ success: true, message: "Status added" });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const getLeadStats = async (req, res) => {
  try {
    const all = await Lead.find();
    return res.status(200).json({
      success: true,
      stats: {
        total:     all.length,
        new:       all.filter(l => l.status === "New").length,
        contacted: all.filter(l => l.status === "Contacted").length,
        interested:all.filter(l => l.status === "Interested").length,
        converted: all.filter(l => l.status === "Converted").length,
        lost:      all.filter(l => l.status === "Lost").length,
      }
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};