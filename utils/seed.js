import { Plan } from "../models/Plan.js";
import { User } from "../models/User.js";

/**
 * Seed Database with Default Plans
 * Run this once to initialize the database with default gym plans
 */
export const seedDatabase = async () => {
  try {
    // Check if plans already exist
    const existingPlans = await Plan.countDocuments();
    
    if (existingPlans > 0) {
      console.log("Database already seeded with plans");
      return;
    }

    // Default Gym Plans
    const plans = [
      {
        name: "Guest Plan",
        duration: 1, // 1 day
        price: 150,
        description: "Single day guest pass",
        features: ["Access to gym", "One-time visit"],
      },
      {
        name: "Basic Plan",
        duration: 30, // 1 month
        price: 1000,
        description: "Monthly membership",
        features: [
          "Unlimited gym access",
          "Gym equipment usage",
          "Locker facility"
        ],
      },
      {
        name: "Standard Plan",
        duration: 90, // 3 months
        price: 2500,
        description: "Quarterly membership with trainer access",
        features: [
          "Unlimited gym access",
          "2 Personal training sessions/month",
          "Diet consultation",
          "Body measurement tracking"
        ],
      },
      {
        name: "Premium Plan",
        duration: 180, // 6 months
        price: 4500,
        description: "Premium membership with full benefits",
        features: [
          "Unlimited gym access",
          "4 Personal training sessions/month",
          "Custom diet plan",
          "Weekly body measurements",
          "Progress photos",
          "Priority support",
          "Access to classes"
        ],
      },
    ];

    // Create plans
    await Plan.insertMany(plans);
    console.log("✓ Default plans created successfully");

    // Create admin user (optional)
    const adminExists = await User.findOne({ email: "admin@wfc.com" });
    if (!adminExists) {
      const adminUser = new User({
        name: "Admin",
        email: "admin@wfc.com",
        phone: "9876543210",
        password: "admin@123", // Will be hashed by schema pre-save
        role: "admin",
        isActive: true,
      });
      await adminUser.save();
      console.log("✓ Admin user created: admin@wfc.com");
    }

  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

/**
 * Usage in server.js:
 * 
 * import { seedDatabase } from "./utils/seed.js";
 * 
 * app.listen(port, async () => {
 *   console.log(`Server is running on port ${port}`);
 *   await connectDb();
 *   await seedDatabase();
 * });
 */
