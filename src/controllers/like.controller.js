import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => { //working
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!videoId) {
        throw new ApiError(400, "video id is required")
    }
    const videoLike = await Like.findOne({ video: new mongoose.Types.ObjectId(`${videoId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })

    let result;

    try {
        if (videoLike) {
            result = await Like.deleteOne({ video: new mongoose.Types.ObjectId(`${videoId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        else {
            result = await Like.create({ video: new mongoose.Types.ObjectId(`${videoId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, result, "video like toggled successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error while toggling video like")
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => { //working
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!commentId) {
        throw new ApiError(400, "comment id is required")
    }
    const commentLike = await Like.findOne({ comment: new mongoose.Types.ObjectId(`${commentId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })

    let result;

    try {
        if (commentLike) {
            result = await Like.deleteOne({ comment: new mongoose.Types.ObjectId(`${commentId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        else {
            result = await Like.create({ comment: new mongoose.Types.ObjectId(`${commentId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, result, "comment like toggled successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error while toggling comment like")
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => { //working
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!tweetId) {
        throw new ApiError(400, "tweet id is required")
    }
    const tweetLike = await Like.findOne({ tweet: new mongoose.Types.ObjectId(`${tweetId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })

    let result;

    try {
        if (tweetLike) {
            result = await Like.deleteOne({ tweet: new mongoose.Types.ObjectId(`${tweetId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        else {
            result = await Like.create({ tweet: new mongoose.Types.ObjectId(`${tweetId}`), likedBy: new mongoose.Types.ObjectId(`${req.user._id}`) })
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, result, "tweet like toggled successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error while toggling tweet like")
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => { //working
    //TODO: get all liked videos
    try {
        const likedVideos = await Like.aggregate([
            {
                $match: {
                    video: { $exists: true },
                    likedBy: new mongoose.Types.ObjectId(`${req.user._id}`)
                }
            }
        ])
        if (!likedVideos) {
            throw new ApiError(404, "user has no liked videos")
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, likedVideos, "liked videos fetched successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error while fetching liked videos")
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}