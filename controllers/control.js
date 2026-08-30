import { Registration } from "../models/registration.js";
import { User } from "../models/User.js";
import { WeightHistory } from "../models/WeightHistory.js";

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const {
      name, age, gender, emails, height, weight, bmi, bloodGroup,
      issues, description = "", profession, phone, address, pincode,
      packages, duration, services, startDate, endDate,
      bodyFat, waist, neck, hip,
      sugarLevel, bloodPressure, attendanceId = "",
      personalTraining = "", customWorkout = "", customDiet = "", rehabTherapy = "",
      goal = "",
    } = req.body;
    console.log("Register body:", req.body);

    console.log("Register Request body:", req.body);
    console.log("Register Request files:", req.files);

    // Image paths from multer
    const profileImage   = req.files?.profileImage?.[0]?.path   || "";
    const frontBodyImage = req.files?.frontBodyImage?.[0]?.path || "";
    const sideBodyImage  = req.files?.sideBodyImage?.[0]?.path  || "";
    const backBodyImage  = req.files?.backBodyImage?.[0]?.path  || "";

    // if (!name || !age || !gender || !emails) {
    //   return res.status(400).json({ message: "Please provide all required details (name, age, gender, email)" });
    // }

    // Health status
    let statusLevel = "Normal";
    if (gender === "Male"   && (age > 40 || bmi > 25 || bodyFat > 20)) statusLevel = "High";
    if (gender === "Female" && (age > 40 || bmi > 24 || bodyFat > 30)) statusLevel = "High";

    const newUser = new Registration({
      name, age, gender, emails, height, weight, bmi, bloodGroup,
      issues, description, profession, phone, address, pincode,
      packages, duration, services, startDate, endDate,
      bodyFat, waist, neck, hip, sugarLevel, bloodPressure,
      attendanceId,
      personalTraining, customWorkout, customDiet, rehabTherapy,
      statusLevel, goal,
      images: { profileImage, frontBodyImage, sideBodyImage, backBodyImage },
    });

    const savedUser = await newUser.save();

    if (weight !== undefined && weight !== null && weight !== "") {
      await WeightHistory.create({
        registrationId: savedUser._id,
        memberName: name || "",
        weight: Number(weight),
        recordDate: new Date(startDate || Date.now()),
        recordTime: new Date().toTimeString().slice(0, 5),
        notes: "Initial weight recorded at registration",
        recordType: "initial",
      });
    }

    // Auto-link: if a User account exists with the same phone, set their registrationId
    if (phone) {
      await User.findOneAndUpdate(
        { phone, registrationId: null },
        { registrationId: savedUser._id }
      );
    }

    return res.status(200).json({ message: "Registered successfully!", data: savedUser });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ── Fetch All ─────────────────────────────────────────────────────────────────
export const fetch = async (req, res) => {
  try {
    // Exclude blocked members from general fetch lists — blocked members are only visible via block-list
    const fetchAll = await Registration.find({ status: { $ne: "blocked" } });
    res.status(200).json({ message: "fetch all data", data: fetchAll });
  } catch (err) {
    console.log("fetch error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
// NOTE: This route must use multer middleware to parse multipart/form-data
export const updatereg = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Update body:", req.body);
    console.log("Update files:", req.files);

    // req.body is parsed by multer — all form fields arrive as strings
    const {
      name, age, gender, emails, height, weight, bmi, bloodGroup,
      issues, description = "", profession, phone, address, pincode,
      packages, duration, services, startDate, endDate,
      bodyFat, waist, neck, hip, sugarLevel, bloodPressure,
      attendanceId = "",
      personalTraining = "", customWorkout = "", customDiet = "", rehabTherapy = "",
      goal,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Fetch existing user to keep old images if no new ones uploaded
    const existing = await Registration.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Use new image if uploaded, otherwise keep existing
    const profileImage   = req.files?.profileImage?.[0]?.path   || existing.images?.profileImage   || "";
    const frontBodyImage = req.files?.frontBodyImage?.[0]?.path || existing.images?.frontBodyImage || "";
    const sideBodyImage  = req.files?.sideBodyImage?.[0]?.path  || existing.images?.sideBodyImage  || "";
    const backBodyImage  = req.files?.backBodyImage?.[0]?.path  || existing.images?.backBodyImage  || "";

    // Health status recalculate
    let statusLevel = existing.statusLevel || "Normal";
    if (gender === "Male"   && (age > 40 || bmi > 25 || bodyFat > 20)) statusLevel = "High";
    if (gender === "Female" && (age > 40 || bmi > 24 || bodyFat > 30)) statusLevel = "High";

    const updateData = {
      name, age, gender, emails, height, weight, bmi, bloodGroup,
      issues, description, profession, phone, address, pincode,
      packages, duration, services, startDate, endDate,
      bodyFat, waist, neck, hip, sugarLevel, bloodPressure,
      attendanceId,
      personalTraining, customWorkout, customDiet, rehabTherapy,
      statusLevel, goal: goal !== undefined ? goal : existing.goal,
      images: { profileImage, frontBodyImage, sideBodyImage, backBodyImage },
    };

    const updatedUser = await Registration.findByIdAndUpdate(id, updateData, { new: true });

    return res.status(200).json({ message: "Updated successfully", data: updatedUser });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deletereg = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Registration.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Member not found" });
    res.status(200).json({ message: "Deleted successfully", data: deleted });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ── Fetch One ─────────────────────────────────────────────────────────────────
export const fetchOne = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      req.user.role === "member" &&
      (!req.user.registrationId || req.user.registrationId.toString() !== id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const user = await Registration.findById(id);
    if (!user) return res.status(404).json({ message: "Member not found" });
    res.status(200).json({ message: "fetch one data", data: user });
  } catch (err) {
    console.error("fetchOne error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};