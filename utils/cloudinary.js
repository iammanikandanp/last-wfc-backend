// utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dofxwhwbv",
  api_key:    process.env.CLOUDINARY_API_KEY    || "173583618628646",
  api_secret: process.env.CLOUDINARY_API_SECRET || "PSz0Q9B-KioxszDb6inTUzJaAO8",
});

export default cloudinary;