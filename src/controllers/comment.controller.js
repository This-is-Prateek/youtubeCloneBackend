import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!videoId) {
        throw new ApiError(400, "video id is required");
    }

    const skip = (page - 1) * limit;

    const totalComments = await Comment.countDocuments({
        video: new mongoose.Types.ObjectId(`${videoId}`),
    });
    const totalPages = Math.ceil(totalComments / limit);

    try {
        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(`${videoId}`),
                },
            },
            {
                $lookup: {
                    from: "users", // Name of the users collection
                    localField: "owner", // The owner field in Comment
                    foreignField: "_id", // The _id field in User
                    as: "ownerData",
                },
            },
            {
                $unwind: {
                    path: "$ownerData",
                    preserveNullAndEmptyArrays: true, // In case user was deleted
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    "owner._id": "$ownerData._id",
                    "owner.fullName": "$ownerData.fullName",
                    "owner.avatar": "$ownerData.avatar", // or whatever you store
                },
            },
            { $sort: { createdAt: -1 } }, // newest first
            { $skip: skip },
            { $limit: parseInt(limit) },
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                { comments, totalPages, totalComments },
                "comments fetched successfully"
            )
        );
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error fetching comments");
    }
});

const addComment = asyncHandler(async (req, res) => { //working
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if (!videoId || !content) {
        throw new ApiError(400, "video id and comment are required")
    }

    try {
        const comment = await Comment.create({
            content,
            video: new mongoose.Types.ObjectId(`${videoId}`),
            owner: new mongoose.Types.ObjectId(`${req.user._id}`)
        })
        if (!comment) {
            throw new ApiError(400, "there was an error adding comment")
        }

        const populatedComment = await comment
        .populate("owner", "fullName email avatar"); 

        return res
            .status(200)
            .json(
                new ApiResponse(200, comment, "comment added successfully")
            )
    } catch (error) {
        console.error(error)
        throw new ApiError(500, "Internal server error adding comment")
    }
})

const updateComment = asyncHandler(async (req, res) => { //working
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body
    if (!commentId || !content) {
        throw new ApiError(400, "comment id and content are required")
    }
    try {
        const comment = await Comment.findByIdAndUpdate(
            new mongoose.Types.ObjectId(`${commentId}`),
            {
                $set: {
                    content
                }
            },
            { new: true }
        )
        if (!comment) {
            throw new ApiError(404, "no comment available to update")
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, comment, "comment updated successfully")
            )
    } catch (error) {
        throw new ApiError(500, "Internal server error updating comment")
    }
})

const deleteComment = asyncHandler(async (req, res) => { //working
    // TODO: delete a comment
    const { commentId } = req.params
    if (!commentId) {
        throw new ApiError(400, "comment id is required")
    }
    try {
        const result = await Comment.deleteOne({ _id: new mongoose.Types.ObjectId(`${commentId}`) })
        if (result.deletedCount === 0) {
            throw new ApiError(404, "no comment available to delete")
        }
        return res
            .status(200)
            .json(
                new ApiResponse(200, result, "comment deleted successfully")
            )
    } catch (error) {
        throw new ApiError(500, "Internal server error deleting comment")
    }
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}