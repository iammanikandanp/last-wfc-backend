import { Member } from "../models/Member.js";
import { User } from "../models/User.js";
import {
  calculateBMI,
  getFitnessCategory,
  calculateWaistHipRatio,
  isOverdue,
  isExpiringsoon,
} from "../utils/helpers.js";

// Create member
export const createMember = async (req, res) => {
  try {
    const {
      userId,
      dateOfBirth,
      emergencyContact,
      emergencyContactPhone,
      medicalConditions,
      gender,
      height,
      weight,
      waist,
      hip,
      chest,
      arm,
      thigh,
      profession,
      address,
      city,
      state,
      pincode,
      currentPlan,
      startDate,
      personalTraining,
      customWorkout,
      customDiet,
      rehabTherapy,
    } = req.body;

    // Calculate BMI and fitness category
    const bmi = calculateBMI(weight, height);
    const fitnessCategory = getFitnessCategory(bmi);
    const waistHipRatio = calculateWaistHipRatio(waist, hip);

    // Calculate expiry date based on plan
    let expiryDate = startDate;
    if (req.body.planDuration) {
      expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + req.body.planDuration);
    }

    const member = new Member({
      userId,
      dateOfBirth,
      emergencyContact,
      emergencyContactPhone,
      medicalConditions,
      gender,
      height,
      weight,
      waist,
      hip,
      chest,
      arm,
      thigh,
      bmi,
      waistHipRatio,
      fitnessCategory,
      profession,
      address,
      city,
      state,
      pincode,
      currentPlan,
      startDate,
      expiryDate,
      personalTraining,
      customWorkout,
      customDiet,
      rehabTherapy,
      status: "active",
    });

    await member.save();

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all members
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find()
      .populate("userId", "name email phone")
      .populate("currentPlan", "name price duration");

    const membersWithStatus = members.map((member) => {
      const overdue = isOverdue(member.expiryDate);
      const expiringSoon = isExpiringsoon(member.expiryDate);

      return {
        ...member.toObject(),
        isOverdue: overdue,
        isExpiringSoon: expiringSoon,
        displayStatus: overdue ? "overdue" : expiringSoon ? "expiring" : member.status,
      };
    });

    res.status(200).json({
      success: true,
      count: members.length,
      members: membersWithStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single member
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("currentPlan");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update member
export const updateMember = async (req, res) => {
  try {
    const { height, weight, waist, hip, ...otherData } = req.body;

    let member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Update basic fields
    Object.assign(member, otherData);

    // Recalculate measurements if height or weight changed
    if (height || weight) {
      const newHeight = height || member.height;
      const newWeight = weight || member.weight;
      const newWaist = waist || member.waist;
      const newHip = hip || member.hip;

      member.height = newHeight;
      member.weight = newWeight;
      member.waist = newWaist;
      member.hip = newHip;

      member.bmi = calculateBMI(newWeight, newHeight);
      member.fitnessCategory = getFitnessCategory(member.bmi);
      member.waistHipRatio = calculateWaistHipRatio(newWaist, newHip);
    }

    await member.save();

    res.status(200).json({
      success: true,
      message: "Member updated successfully",
      member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add progress photo
export const addProgressPhoto = async (req, res) => {
  try {
    const { type, url } = req.body;

    if (!type || !url) {
      return res.status(400).json({
        success: false,
        message: "Please provide photo type and URL",
      });
    }

    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    member.progressPhotos.push({
      type,
      url,
      uploadedAt: new Date(),
    });

    await member.save();

    res.status(200).json({
      success: true,
      message: "Progress photo added successfully",
      member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: "active" });
    const expiredMembers = await Member.countDocuments({ status: "expired" });
    const suspendedMembers = await Member.countDocuments({ status: "suspended" });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringMembers = await Member.countDocuments({
      expiryDate: {
        $lte: sevenDaysFromNow,
        $gt: now,
      },
    });

    const pendingPaymentMembers = await Member.countDocuments({
      pendingAmount: { $gt: 0 },
    });

    res.status(200).json({
      success: true,
      statistics: {
        totalMembers,
        activeMembers,
        expiredMembers,
        suspendedMembers,
        expiringMembers,
        pendingPaymentMembers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete member
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
