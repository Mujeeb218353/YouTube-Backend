import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(localFilePath) return null
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File uploaded to cloudinary:", res.url);
        return res;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log("ERROR UPLOADING TO CLOUDINARY:",error);
        return null;
    }
};

export { uploadOnCloudinary };