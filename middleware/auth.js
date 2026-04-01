import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized to access this route" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: "Not authorized to access this route" 
    });
  }
};

// Restrict to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role not authorized to access this resource",
      });
    }
    next();
  };
};
