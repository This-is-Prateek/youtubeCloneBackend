import mongoose from "mongoose";
import { Dislike } from "../models/dislike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }
    const videoDislike = await Dislike.findOne({
        video: new mongoose.Types.ObjectId(`${videoId}`),
        dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
    });

    let result;
    try {
        if (videoDislike) {
            result = await Dislike.deleteOne({
                video: new mongoose.Types.ObjectId(`${videoId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        } else {
            result = await Dislike.create({
                video: new mongoose.Types.ObjectId(`${videoId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        }
        return res.status(200).json(
            new ApiResponse(200, result, "Video dislike toggled successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Internal server error while toggling video dislike");
    }
});

const toggleCommentDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }
    const commentDislike = await Dislike.findOne({
        comment: new mongoose.Types.ObjectId(`${commentId}`),
        dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
    });

    let result;
    try {
        if (commentDislike) {
            result = await Dislike.deleteOne({
                comment: new mongoose.Types.ObjectId(`${commentId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        } else {
            result = await Dislike.create({
                comment: new mongoose.Types.ObjectId(`${commentId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        }
        return res.status(200).json(
            new ApiResponse(200, result, "Comment dislike toggled successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Internal server error while toggling comment dislike");
    }
});

const toggleTweetDislike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }
    const tweetDislike = await Dislike.findOne({
        tweet: new mongoose.Types.ObjectId(`${tweetId}`),
        dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
    });

    let result;
    try {
        if (tweetDislike) {
            result = await Dislike.deleteOne({
                tweet: new mongoose.Types.ObjectId(`${tweetId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        } else {
            result = await Dislike.create({
                tweet: new mongoose.Types.ObjectId(`${tweetId}`),
                dislikedBy: new mongoose.Types.ObjectId(`${req.user._id}`),
            });
        }
        return res.status(200).json(
            new ApiResponse(200, result, "Tweet dislike toggled successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Internal server error while toggling tweet dislike");
    }
});

export {
    toggleCommentDislike,
    toggleTweetDislike,
    toggleVideoDislike,
};

