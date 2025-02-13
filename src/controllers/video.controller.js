import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deletefromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

        let queryObject = {};
        if (query) {
            queryObject = {
                ...queryObject,
                $or: [{ title: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }]
            };
        }
        if (userId) {
            queryObject = { ...queryObject, owner: userId };
        }

        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortType === 'asc' ? 1 : -1;
        }

        const skip = (page - 1) * limit;

        const aggregationPipeline = [
            { $match: queryObject },
            {
                $lookup: {
                    from: 'users', // The collection to join
                    localField: 'owner', // Field from the videos collection
                    foreignField: '_id', // Field from the users collection
                    as: 'ownerInfo' // Output array field
                }
            },
            {
                $unwind: "$ownerInfo"
            },
            {
                $addFields: {
                    ownerName: "$ownerInfo.fullName" // Add the owner's name from the first element in the array
                }
            },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    ownerInfo: 0
                }
            }
        ];

        if (sortBy) {
            aggregationPipeline.push({ $sort: sortOptions });
        }

        const videos = await Video.aggregate(aggregationPipeline);

        const totalVideos = await Video.countDocuments(queryObject);

        if (!videos.length) {
            return res.status(404).json(
                new ApiResponse(404, null, "No videos found")
            );
        }

        return res.status(200).json(
            new ApiResponse(200, {
                videos,
                page,
                totalPages: Math.ceil(totalVideos / limit),
                totalVideos
            }, "Required videos fetched successfully")
        );
    } catch (error) {
        console.error('Error fetching videos:', error); // Log the error details
        return res.status(500).json(
            new ApiResponse(500, null, "Internal server error")
        );
    }
})

const publishAVideo = asyncHandler(async (req, res) => { //working
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field.trim() == "")) {
        throw new ApiError(400, "All fields are required")
    }

    const videoFileLocalPath = req.files?.videoFile[0].path
    const thumbnailLocalPath = req.files?.thumbnail[0].path

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "video file and thumbnail are required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile || !thumbnail) {
        throw new ApiError(500, "Error uploading video file or thumbnail")
    }

    const video = await Video.create(
        {
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title,
            description,
            duration: videoFile.duration,
            owner: req.user
        }
    )

    const uploadedVideo = await Video.findById(video._id)

    if (!uploadedVideo) {
        throw new ApiError(500, "Internal server error while uploading video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, uploadedVideo, "Video file uploaded successfully")
        )


})

const getVideoById = asyncHandler(async (req, res) => { //working
    const { videoId } = req.params
    //TODO: get video by id
    if (!videoId?.trim()) {
        throw new ApiError(400, "Video id is missing")
    }

    const video = await Video.findByIdAndUpdate(
        new mongoose.Types.ObjectId(`${videoId}`),
        {
            $inc: { views: 1 }
        },
        { new: true }
    )

    if (!video) {
        throw new ApiError(404, "No such video exists")
    }

    const user = await User.findByIdAndUpdate(
        new mongoose.Types.ObjectId(`${req.user._id}`),
        {
            $push: {
                watchHistory: new mongoose.Types.ObjectId(`${videoId}`)
            }
        },
        { new: true }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "video fetched successfully")
        )
})

const updateVideo = asyncHandler(async (req, res) => { //working
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing");
    }

    if (!title || !description) {
        throw new ApiError(400, "Title and description are missing");
    }

    try {
        const video = await Video.findById(new mongoose.Types.ObjectId(`${videoId}`));

        if (!video) {
            throw new ApiError(404, "No such video file exists");
        }

        // Check if thumbnail file exists
        const thumbnailLocalPath = req.file ? req.file.path : null;

        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Thumbnail is required");
        }

        // Upload the new thumbnail
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail) {
            throw new ApiError(500, "Error uploading thumbnail");
        }

        // Delete the old thumbnail from Cloudinary
        const result = await deletefromCloudinary(video.thumbnail, "image");
        console.log(result);

        // Update the video with the new details
        const updatedVideo = await Video.findByIdAndUpdate(
            new mongoose.Types.ObjectId(`${videoId}`),
            {
                $set: {
                    title,
                    description,
                    thumbnail: thumbnail.url
                }
            },
            { new: true }
        );

        return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
    } catch (error) {
        throw new ApiError(500, `Internal server error: ${error.message}`);
    }
});


const deleteVideo = asyncHandler(async (req, res) => { //working
    const { videoId } = req.params
    //TODO: delete video
    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "no such video file exists")
    }

    const result = await deletefromCloudinary(video.videoFile, "video")

    if (!result) {
        throw new ApiError(500, "Internal server error deleting video file")
    }

    const deletedVideo = await Video.deleteOne({ _id: videoId })

    if (!deletedVideo) {
        throw new ApiError(500, "Internal server error deleting video")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => { //working
    const { videoId } = req.params
    const { isPublished } = req.body

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished
            }
        },
        { new: true }
    )

    if (!video) {
        throw new ApiError(404, "no such video file exists")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "video publishing status updated successfully")
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}