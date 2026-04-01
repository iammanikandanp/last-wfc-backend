import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },
    type: {
      type: String,
      enum: [
        "expiry_reminder",
        "payment_reminder",
        "workout_reminder",
        "promotion",
        "general",
      ],
    },
    title: String,
    message: String,
    deliveryMethods: [
      {
        type: String,
        enum: ["email", "sms", "whatsapp"],
      },
    ],
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    relatedId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
