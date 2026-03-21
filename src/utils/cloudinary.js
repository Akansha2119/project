import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    console.log("Uploading from:", localFilePath);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("✅ Upload success:", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("❌ REAL CLOUDINARY ERROR:", error); // 🔥 IMPORTANT

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    throw null;
  }
};

// cloudinary.uploader.upload(
//   "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" },
//   function (error, result) {
//     console.log(result);
//   }
// );
export { uploadCloudinary };
