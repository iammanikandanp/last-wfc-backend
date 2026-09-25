import { Registration } from "../models/registration.js";
import { generateToken } from "../utils/helpers.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Member Login Endpoint
export const memberLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and date of birth are required.",
      });
    }

    // Normalize mobile
    const normalizedMobile = mobile.replace(/\s+/g, "");

    // Find member
    const member = await Registration.findOne({ phone: normalizedMobile });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member account not found.",
      });
    }

    // Check status
    if (member.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account is currently blocked. Please contact WFC Enterprises.",
      });
    }

    // Check password existence
    if (!member.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number or password.",
      });
    }

    // Format password if it comes as YYYY-MM-DD to DD/MM/YYYY for comparison
    let formattedPassword = password;
    if (password && password.includes("-")) {
      const parts = password.split("-");
      if (parts.length === 3 && parts[0].length === 4) { // YYYY-MM-DD
        formattedPassword = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Verify password (DOB)
    const isMatch = await bcrypt.compare(formattedPassword, member.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number or password.",
      });
    }

    // Generate token - indicating it's a Registration member
    const token = jwt.sign(
      { id: member._id, userId: member._id, isRegistration: true, role: "member" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Member login successful",
      token,
      member: {
        id: member._id,
        name: member.name,
        mobile: member.phone,
        profileImage: member.images?.profileImage || "",
        status: member.status,
        role: "member",
      },
    });
  } catch (error) {
    console.error("Member Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
