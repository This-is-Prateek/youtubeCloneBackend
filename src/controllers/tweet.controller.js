import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => { //working
    //TODO: create tweet
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "content is required to make a tweet")
    }

    const tweet = await Tweet.create({ content, owner: new mongoose.Types.ObjectId(`${req.user._id}`) })

    if (!tweet) {
        throw new ApiError(500, "internal server error creating a tweet")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "tweet created successfully")
        )
})

const getUserTweets = asyncHandler(async (req, res) => { //working
    // TODO: get user tweets
    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "user id is required")
    }

    try {
        const tweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(`${userId}`)
                }
            }
        ])

        if (tweets.length === 0) {
            throw new ApiError(404, "no tweets for user are available")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, tweets, "user tweets fetched successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error fetching user tweets", error)
    }
})

const updateTweet = asyncHandler(async (req, res) => { //working
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if (!tweetId && !content) {
        throw new ApiError(400, "tweet Id and content are required")
    }

    try {
        const tweet = await Tweet.findByIdAndUpdate(
            new mongoose.Types.ObjectId(`${tweetId}`),
            {
                $set: {
                    content
                }
            },
            { new: true }
        )

        if (!tweet) {
            throw new ApiError(404, "no user tweet available to update")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, tweet, "tweet updated successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error updating tweet")
    }
})

const deleteTweet = asyncHandler(async (req, res) => { //working
    //TODO: delete tweet
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "tweet id is required")
    }

    try {
        const result = await Tweet.deleteOne({ _id: new mongoose.Types.ObjectId(`${tweetId}`) })

        if (!result) {
            throw new ApiError(404, "no such tweet available to delete")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, result, "tweet deleted successfully")
            )
    } catch (error) {
        throw new ApiError(500, "internal server error deleting tweet")
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}