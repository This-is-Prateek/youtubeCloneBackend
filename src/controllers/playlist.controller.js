import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => { //working
    const { name, description } = req.body
    //TODO: create playlist
    if (!name && !description) {
        throw new ApiError(400, "name and description are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: new mongoose.Types.ObjectId(`${req.user._id}`)
    })

    if (!playlist) {
        throw new ApiError(500, "there was an internal server error creating playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist created successfully")
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => { //working
    const { userId } = req.params
    //TODO: get user playlists
    if (!userId) {
        throw new ApiError(400, "user id is required")
    }

    try {
        const playlists = await Playlist.aggregate([{ $match: { owner: new mongoose.Types.ObjectId(`${userId}`) } }]);
        if (playlists.length === 0) {
            throw new ApiError(404, "No playlists found for the user");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Internal server error fetching user playlists", error);
    }
})

const getPlaylistById = asyncHandler(async (req, res) => { //working
    const { playlistId } = req.params
    //TODO: get playlist by id

    if (!playlistId) {
        throw new ApiError(400, "playlist id is required")
    }

    const playlist = await Playlist.findById(new mongoose.Types.ObjectId(`${playlistId}`))

    if (!playlist) {
        throw new ApiError(500, "internal server error getting playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist fetched successfully")
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => { //working
    const { playlistId, videoId } = req.params

    if (!playlistId || !videoId) {
        throw new ApiError(400, "playlist id and video id are required")
    }

    try {
        const playlist = await Playlist.findOne({ _id: new mongoose.Types.ObjectId(`${playlistId}`), videos: new mongoose.Types.ObjectId(`${videoId}`) })
        let result;
        let message;
        if (playlist) {
            result = playlist
            message = "video already exists in the playlist"
        }
        else {
            result = await Playlist.findByIdAndUpdate(
                new mongoose.Types.ObjectId(`${playlistId}`),
                {
                    $push: { videos: new mongoose.Types.ObjectId(`${videoId}`) }
                },
                { new: true }
            )
            message = "video added to playlist successfully"
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, result, message)
            )
    } catch (error) {
        throw new ApiError(500, "internal server error adding video to playlist")
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => { //working
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!playlistId && !videoId) {
        throw new ApiError(400, "playlist id and video id are required")
    }

    const playlist = await Playlist.findOne({ _id: new mongoose.Types.ObjectId(`${playlistId}`), videos: new mongoose.Types.ObjectId(`${videoId}`) })
    let result;
    let message;

    if (playlist) {
        result = await Playlist.findByIdAndUpdate(
            new mongoose.Types.ObjectId(`${playlistId}`),
            {
                $pull: { videos: new mongoose.Types.ObjectId(`${videoId}`) }
            },
            { new: true }
        )
        message = "video removed from playlist successfully"
    }
    else {
        result = null
        message = "video doesn't exist in the playlist"
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, result, message)
        )
})

const deletePlaylist = asyncHandler(async (req, res) => { //working
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!playlistId) {
        throw new ApiError(400, "playlist id is required")
    }

    const playlist = await Playlist.deleteOne({ _id: new mongoose.Types.ObjectId(`${playlistId}`) })

    if (!playlist) {
        throw new ApiError(500, "internal server error deleting playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist deleted successfully")
        )
})

const updatePlaylist = asyncHandler(async (req, res) => { //working
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    if (!playlistId && !name && !description) {
        throw new ApiError(400, "playlist id , name and description are required")
    }

    const playlist = await Playlist.findByIdAndUpdate(
        new mongoose.Types.ObjectId(`${playlistId}`),
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    )

    if (!playlist) {
        throw new ApiError(500, "internal server error while updating the playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist updated successfully")
        )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}