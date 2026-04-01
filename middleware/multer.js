// middleware/multer.js
// Uploads images directly to Cloudinary — stores permanent public HTTPS URL in MongoDB

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dofxwhwbv",
  api_key:    process.env.CLOUDINARY_API_KEY    || "173583618628646",
  api_secret: process.env.CLOUDINARY_API_SECRET || "PSz0Q9B-KioxszDb6inTUzJ",
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          "wfc-members",
    public_id:       `${file.fieldname}-${Date.now()}`,
    resource_type:   "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation:  [{ width: 900, height: 900, crop: "limit", quality: "auto:good" }],
  }),
});

const parser = multer({ storage });
export default parser;