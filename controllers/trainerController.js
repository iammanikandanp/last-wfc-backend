import { Trainer } from "../models/Trainer.js";
import { PersonalTraining } from "../models/PersonalTraining.js";

// Create trainer
export const createTrainer = async (req, res) => {
  try {
    const { userId, specialization, certification, yearsOfExperience, bio, hourlyRate } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const trainer = new Trainer({
      userId,
      specialization,
      certification,
      yearsOfExperience,
      bio,
      hourlyRate,
    });

    await trainer.save();

    res.status(201).json({
      success: true,
      message: "Trainer created successfully",
      trainer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all trainers
export const getAllTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find().populate("userId", "name email phone");

    res.status(200).json({
      success: true,
      count: trainers.length,
      trainers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get trainer by ID
export const getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id).populate("userId");

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    res.status(200).json({
      success: true,
      trainer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update trainer
export const updateTrainer = async (req, res) => {
  try {
    let trainer = await Trainer.findById(req.params.id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    Object.assign(trainer, req.body);
    await trainer.save();

    res.status(200).json({
      success: true,
      message: "Trainer updated successfully",
      trainer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Assign trainer to member
export const assignTrainingTomember = async (req, res) => {
  try {
    const { memberId, trainerId, packageName, totalSessions, startDate, endDate } = req.body;

    if (!memberId || !trainerId || !totalSessions) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const personalTraining = new PersonalTraining({
      memberId,
      trainerId,
      packageName,
      totalSessions,
      remainingSessions: totalSessions,
      startDate,
      endDate,
      status: "active",
    });

    await personalTraining.save();

    res.status(201).json({
      success: true,
      message: "Trainer assigned successfully",
      personalTraining,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get training sessions
export const getTrainingSessions = async (req, res) => {
  try {
    const sessions = await PersonalTraining.find({ memberId: req.params.memberId })
      .populate("trainerId", "userId totalSessions")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark session as completed
export const completeSession = async (req, res) => {
  try {
    const { trainingId, sessionIndex } = req.body;

    const training = await PersonalTraining.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    if (sessionIndex >= 0 && sessionIndex < training.sessions.length) {
      training.sessions[sessionIndex].completed = true;
      training.completedSessions += 1;
      training.remainingSessions -= 1;

      if (training.remainingSessions === 0) {
        training.status = "completed";
      }

      await training.save();
    }

    res.status(200).json({
      success: true,
      message: "Session marked as completed",
      training,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
