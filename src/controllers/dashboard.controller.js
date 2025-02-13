import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => { //working
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    let channelStats = {}
    try {
        const totalVideoViews = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(`${req.user._id}`)
                }
            },
            {
                $group: {
                    _id: new mongoose.Types.ObjectId(`${req.user._id}`),
                    totalVideoViews: { $sum: "$views" }
                }
            }
        ])
        channelStats.totalVideoViews = totalVideoViews.length > 0 ? totalVideoViews[0].totalVideoViews : 0;
    } catch (error) {
        throw new ApiError(500, "internal server error fetching total channel video views")
    }
    try {
        const totalSubscribers = await Subscription.countDocuments({ channel: new mongoose.Types.ObjectId(`${req.user._id}`) })
        channelStats.totalSubscribers = totalSubscribers;
    } catch (error) {
        throw new ApiError(500, "internal server error fetching total subscriber count")
    }
    try {
        const totalVideos = await Video.countDocuments({ owner: new mongoose.Types.ObjectId(`${req.user._id}`) })
        channelStats.totalVideos = totalVideos;
    } catch (error) {
        throw new ApiError(500, "internal server error fetching total videos count of the chanell")
    }
    try {
        const totalLikes = await Like.aggregate([
            {
                $match: {
                    video: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videoDetails"
                }
            },
            {
                $unwind: "$videoDetails"
            },
            {
                $match: {
                    "videoDetails.channel": new mongoose.Types.ObjectId(`${req.user._id}`)
                }
            },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: 1 }
                }
            }
        ])
        channelStats.totalLikes = totalLikes.length > 0 ? totalLikes[0].totalLikes : 0;
    } catch (error) {
        throw new ApiError(500, "internal server error fetching total likes on the videos")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channelStats, "channel stats fetched successfully")
        )
})

const getChannelVideos = asyncHandler(async (req, res) => { //working
    // TODO: Get all the videos uploaded by the channel
    try {
        const videos = await Video.find({ owner: new mongoose.Types.ObjectId(`${req.user._id}`) })
        if (!videos.length === 0) {
            throw new ApiError(404, "no videos available to show")
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, videos, "channel videos fetched successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error fetching channel videos")
    }
})

export {
    getChannelStats,
    getChannelVideos
}