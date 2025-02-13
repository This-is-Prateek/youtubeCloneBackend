import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => { //working
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!channelId) {
        throw new ApiError(400, "channel id is required")
    }

    const existingSubscriber = await Subscription.findOne(
        {
            channel: new mongoose.Types.ObjectId(`${channelId}`),
            subscriber: req.user._id
        }
    )

    let subscription
    let message
    if (existingSubscriber) {
        subscription = await Subscription.deleteOne({ _id: existingSubscriber._id })
        message = "unsubscribed from channel successfully"
    }
    else {
        subscription = await Subscription.create(
            {
                subscriber: req.user._id,
                channel: channelId
            }
        )
        message = "subscribed to channel successfully"
    }

    if (subscription === undefined) {
        throw new ApiError(500, "Error subscribing channel")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscription, message)
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => { //working
    const { channelId } = req.params

    if (!channelId) {
        throw new ApiError(400, "channel id is required")
    }

    const subscribers = await Subscription.countDocuments({ channel: new mongoose.Types.ObjectId(`${channelId}`) })

    if (!subscribers) {
        throw new ApiError(500, "internal server error fetching subscriber count")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribers, "subscribers fetched successfully")
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => { //working
    const { subscriberId } = req.params
    if (!subscriberId) {
        throw new ApiError(400, "subscriber id is required")
    }

    try {
        const channelsSubscribed = await Subscription.countDocuments({ subscriber: new mongoose.Types.ObjectId(`${subscriberId}`) })

        return res
            .status(200)
            .json(
                new ApiResponse(200, channelsSubscribed, "channels subscribed fetched successfully")
            )

    } catch (error) {
        throw new ApiError(500, "internal server error fetching channels subscribed")
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}