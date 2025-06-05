import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  //working
  try {
    const { channelId } = req.params;
    // TODO: toggle subscription
    if (!channelId) {
      throw new ApiError(400, "channel id is required");
    }

    const existingSubscriber = await Subscription.findOne({
      channel: new mongoose.Types.ObjectId(`${channelId}`),
      subscriber: req.user._id,
    });

    let subscription;
    let message;
    if (existingSubscriber) {
      subscription = await Subscription.deleteOne({
        _id: existingSubscriber._id,
      });
      message = "unsubscribed from channel successfully";
    } else {
      subscription = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
      });
      message = "subscribed to channel successfully";
    }

    if (subscription === undefined) {
      throw new ApiError(500, "Error subscribing channel");
    }

    return res.status(200).json(new ApiResponse(200, subscription, message));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Error toggling subscription",
          error.message,
        ),
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;

    if (!channelId || !isValidObjectId(channelId)) {
      throw new ApiError(400, "Valid channel ID is required");
    }

    const subscribers = await Subscription.find({
      channel: channelId,
    }).populate("subscriber", "_id fullName userName avatar");

    const subscriberCount = await Subscription.countDocuments({
      channel: channelId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribers, subscriberCount },
          "Subscribers fetched successfully",
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Error fetching subscribers", error.message),
      );
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  try {
    const { subscriberId } = req.params;

    if (!subscriberId || !isValidObjectId(subscriberId)) {
      throw new ApiError(400, "Valid subscriber ID is required");
    }

    // Find channels user has subscribed to
    const channelsSubscribed = await Subscription.find({
      subscriber: subscriberId,
    }).populate("channel", "_id fullName userName avatar");

    if (!channelsSubscribed || channelsSubscribed.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            null,
            "No subscribed channels found for this user",
          ),
        );
    }

    // Count subscriptions made by the user
    const subscriptionCount = await Subscription.countDocuments({
      subscriber: subscriberId,
    });

    // Add subscriberCount to each channel
    const channelsWithCounts = await Promise.all(
      channelsSubscribed.map(async (sub) => {
        const count = await Subscription.countDocuments({
          channel: sub.channel._id,
        });

        return {
          ...sub.channel.toObject(),
          subscriberCount: count,
        };
      }),
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          channelsSubscribed: channelsWithCounts,
          subscriptionCount,
        },
        "Subscribed channels with subscriber counts fetched successfully",
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Error fetching subscribed channels",
          error.message,
        ),
      );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
