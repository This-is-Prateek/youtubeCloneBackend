import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const getCloudinaryIdFromUrl = (url) => {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
    const parts = url.split("/");
    const lastPart = parts.slice(-1)[0];
    const cloudinaryId = lastPart.split(".")[0];
    return cloudinaryId;
};


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        console.log("File uploaded on cloudinary", uploadResult.url);
        fs.unlinkSync(localFilePath)
        return uploadResult;
    } catch (error) {
        fs.unlinkSync(localFilePath);    //deletes the local file if the upload fails
        console.log(error);
    }
}

const deletefromCloudinary = async (url, fileType) => {
    try {
        if (!url) return null;
        const fileId = getCloudinaryIdFromUrl(url);

        // Log the fileId for debugging
        console.log("Attempting to delete file with ID:", fileId);

        const deleteResult = await cloudinary.uploader.destroy(fileId, { resource_type: `${fileType}` });

        console.log("Delete result:", deleteResult);

        if (deleteResult.result === 'not found') {
            console.log(`File with ID ${fileId} not found in Cloudinary.`);
            return null;
        }

        return deleteResult;
    } catch (error) {
        console.log("Error deleting from Cloudinary:", error);
        return null;
    }
};


export { uploadOnCloudinary, deletefromCloudinary }