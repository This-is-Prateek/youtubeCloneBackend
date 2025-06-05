import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deletefromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    let queryObject = {};
    if (query) {
      queryObject = {
        ...queryObject,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      };
    }
    if (userId) {
      queryObject = { ...queryObject, owner: userId };
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: queryObject },
      {
        $lookup: {
          from: "users", // The collection to join
          localField: "owner", // Field from the videos collection
          foreignField: "_id", // Field from the users collection
          as: "ownerInfo", // Output array field
        },
      },
      {
        $unwind: "$ownerInfo",
      },
      {
        $addFields: {
          ownerName: "$ownerInfo.fullName", // Add the owner's name from the first element in the array
          channelImg: "$ownerInfo.avatar",
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          ownerInfo: 0,
        },
      },
    ];

    if (sortBy) {
      aggregationPipeline.push({ $sort: sortOptions });
    }

    const videos = await Video.aggregate(aggregationPipeline);

    const totalVideos = await Video.countDocuments(queryObject);

    if (!videos.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No videos found"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          videos,
          page,
          totalPages: Math.ceil(totalVideos / limit),
          totalVideos,
        },
        "Required videos fetched successfully",
      ),
    );
  } catch (error) {
    console.error("Error fetching videos:", error); // Log the error details
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const getCurrentUserVideos = asyncHandler(async (req, res) => {
  console.log("request received to get current user videos");

  try {
    if (!req.user || !mongoose.isValidObjectId(req.user._id)) {
      throw new ApiError(400, "Invalid or missing user ID");
    }

    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

    let queryObject = {};
    if (query) {
      queryObject = {
        ...queryObject,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      };
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      // Match for user and filter by query
      { $match: { owner: req.user._id, ...queryObject } },

      // Lookup to get user info
      {
        $lookup: {
          from: "users", // The collection to join
          localField: "owner", // Field from the videos collection
          foreignField: "_id", // Field from the users collection
          as: "ownerInfo", // Output array field
        },
      },

      // Unwind the array to get a single document
      { $unwind: "$ownerInfo" },

      // Add owner info to video document
      {
        $addFields: {
          ownerName: "$ownerInfo.fullName",
          channelImg: "$ownerInfo.avatar",
        },
      },

      // Sort if specified
      ...(sortBy ? [{ $sort: sortOptions }] : []),

      // Paginate
      { $skip: skip },
      { $limit: parseInt(limit) },

      // Remove ownerInfo from the output
      {
        $project: {
          ownerInfo: 0,
        },
      },
    ];

    // Fetch videos
    const videos = await Video.aggregate(aggregationPipeline);

    if (!videos.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No videos found"));
    }

    // Fetch total count of videos (for pagination)
    const totalVideos = await Video.countDocuments(queryObject);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          videos,
          page,
          totalPages: Math.ceil(totalVideos / limit),
          totalVideos,
        },
        "Required videos fetched successfully",
      ),
    );
  } catch (error) {
    console.error("Error fetching videos by user ID:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error"),
      );
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  //working
  try {
    console.log("req.body", req.body);
    console.log("req.files", req.files);

    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    // if ([title, description].some((field) => field.trim() == "")) {
    //     throw new ApiError(400, "All fields are required")
    // }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if (!videoFileLocalPath || !thumbnailLocalPath) {
      throw new ApiError(400, "video file and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail) {
      throw new ApiError(500, "Error uploading video file or thumbnail");
    }

    const video = await Video.create({
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      title,
      description,
      duration: videoFile.duration,
      owner: req.user,
    });

    const uploadedVideo = await Video.findById(video._id);

    if (!uploadedVideo) {
      throw new ApiError(500, "Internal server error while uploading video");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, uploadedVideo, "Video file uploaded successfully"),
      );
  } catch (error) {
    console.error("Error publishing video:", error); // Log the error details
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const getAllVideosByUserId = asyncHandler(async (req, res) => {
  console.log("request received to get all videos by user id");

  try {
    const { userId } = req.params;
    const objectId = new mongoose.Types.ObjectId(String(userId));
    console.log("userId", objectId);
    if (!userId || !isValidObjectId(objectId)) {
      console.log("Invalid userId:", objectId);

      throw new ApiError(400, "Invalid or missing user ID");
    }

    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

    let queryObject = {};
    if (query) {
      queryObject = {
        ...queryObject,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      };
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      // Match for user and filter by query
      { $match: { owner: objectId, ...queryObject } },

      // Lookup to get user info
      {
        $lookup: {
          from: "users", // The collection to join
          localField: "owner", // Field from the videos collection
          foreignField: "_id", // Field from the users collection
          as: "ownerInfo", // Output array field
        },
      },

      // Unwind the array to get a single document
      { $unwind: "$ownerInfo" },

      // Add owner info to video document
      {
        $addFields: {
          ownerName: "$ownerInfo.fullName",
          channelImg: "$ownerInfo.avatar",
        },
      },

      // Sort if specified
      ...(sortBy ? [{ $sort: sortOptions }] : []),

      // Paginate
      { $skip: skip },
      { $limit: parseInt(limit) },

      // Remove ownerInfo from the output
      {
        $project: {
          ownerInfo: 0,
        },
      },
    ];

    // Fetch videos
    const videos = await Video.aggregate(aggregationPipeline);
    console.log("videos", videos);
    // const videos = await Video.find({ owner: userId });
    // console.log("Raw videos", videos);

    if (!videos.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No videos found"));
    }

    // Fetch total count of videos (for pagination)
    const totalVideos = await Video.countDocuments({
      owner: objectId,
      ...queryObject,
    });

    console.log("totalVideos", totalVideos);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          videos,
          page,
          totalPages: Math.ceil(totalVideos / limit),
          totalVideos,
        },
        "Required channel videos fetched successfully",
      ),
    );
  } catch (error) {
    console.error("Error fetching videos by user ID:", error); // Log the error details
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  //working
  try {
    const { videoId } = req.params;
    //TODO: get video by id
    if (!videoId?.trim()) {
      throw new ApiError(400, "Video id is missing");
    }

    const video = await Video.findByIdAndUpdate(
      new mongoose.Types.ObjectId(`${videoId}`),
      {
        $inc: { views: 1 },
      },
      { new: true },
    );

    if (!video) {
      throw new ApiError(404, "No such video exists");
    }

    const aggregationPipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(`${videoId}`) } },

      // Lookup to get user info
      {
        $lookup: {
          from: "users", // The collection to join
          localField: "owner", // Field from the videos collection
          foreignField: "_id", // Field from the users collection
          as: "ownerInfo", // Output array field
        },
      },

      // Unwind the array to get a single document
      { $unwind: "$ownerInfo" },

      // Add owner info to video document
      {
        $addFields: {
          ownerName: "$ownerInfo.fullName",
          channelImg: "$ownerInfo.avatar",
        },
      },

      // Remove ownerInfo from the output
      {
        $project: {
          ownerInfo: 0,
        },
      },
    ];

    const videoDetails = await Video.aggregate(aggregationPipeline);

    if (!videoDetails.length) {
      return res.status(404).json(new ApiResponse(404, null, "No video found"));
    }

    const user = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(`${req.user._id}`),
      {
        $push: {
          watchHistory: new mongoose.Types.ObjectId(`${videoId}`),
        },
      },
      { new: true },
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, videoDetails[0], "video fetched successfully"),
      );
  } catch (error) {
    console.error("Error fetching video by ID:", error); // Log the error details
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Video ID is missing");
  }

  if (!title || !description) {
    throw new ApiError(400, "Title and description are missing");
  }

  try {
    const video = await Video.findById(
      new mongoose.Types.ObjectId(`${videoId}`),
    );

    if (!video) {
      throw new ApiError(404, "No such video file exists");
    }

    let thumbnailUrl = video.thumbnail; // Start with existing thumbnail

    const thumbnailLocalPath = req.file ? req.file.path : null;

    if (thumbnailLocalPath) {
      // Upload the new thumbnail
      const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

      if (!thumbnail) {
        throw new ApiError(500, "Error uploading thumbnail");
      }

      // Delete the old thumbnail from Cloudinary
      await deletefromCloudinary(video.thumbnail, "image");

      thumbnailUrl = thumbnail.url; // Update the thumbnail URL
    }

    // Build update object dynamically
    const updateData = {
      title,
      description,
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
    };

    const updatedVideo = await Video.findByIdAndUpdate(
      new mongoose.Types.ObjectId(`${videoId}`),
      { $set: updateData },
      { new: true },
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
  } catch (error) {
    throw new ApiError(500, `Internal server error: ${error.message}`);
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  //working
  try {
    const { videoId } = req.params;
    //TODO: delete video
    if (!videoId) {
      throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "no such video file exists");
    }

    const result = await deletefromCloudinary(video.videoFile, "video");

    if (!result) {
      throw new ApiError(500, "Internal server error deleting video file");
    }

    const deletedVideo = await Video.deleteOne({ _id: videoId });

    if (!deletedVideo) {
      throw new ApiError(500, "Internal server error deleting video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
  } catch (error) {
    console.error("Error deleting video:", error); // Log the error details
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log("videoId", videoId);

    if (!videoId) {
      throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));

    if (!video) {
      throw new ApiError(404, "No such video file exists");
    }

    // Flip the isPublished flag
    video.isPublished = !video.isPublished;
    await video.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          video,
          "Video publishing status toggled successfully",
        ),
      );
  } catch (error) {
    console.error("Error toggling publish status:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getCurrentUserVideos,
  getAllVideosByUserId,
};
