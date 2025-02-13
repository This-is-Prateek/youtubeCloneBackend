import mongoose from "mongoose";

const dislikeSchema = new mongoose.Schema(
    {
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        },
        dislikedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        tweet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tweet"
        }
    }, 
    { timestamps: true }
)

export const Dislike = mongoose.model("Dislike", dislikeSchema)