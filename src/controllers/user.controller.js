import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { deletefromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, userName, password } = req.body;

    if ([fullName, email, userName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if (existedUser) {
        console.log(existedUser);

        throw new ApiError(409, "User with email or userName already exists");
    }

    let avatarLocalPath;

    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0]?.path;
    }

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0]?.path;
    }

    let avatar;

    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(500, "Error uploading avatar");
        }
    }

    let coverImage;

    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    try {
        const user = await User.create({
            fullName,
            avatar: avatar?.url || "",
            coverImage: coverImage?.url || "",
            email,
            password,
            userName: userName.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        console.log("User registered successfully:", createdUser);

        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );
    } catch (error) {
        console.error("Error during user registration:", error);
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern)[0];
            console.error("Duplicate Key Error Field:", duplicateField);
            throw new ApiError(409, `User with this ${duplicateField} already exists`);
        }
        throw new ApiError(500, "Internal Server Error");
    }
});


const loginUser = asyncHandler(async (req, res) => { //working
    const { email, userName, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "user not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "password is invalid");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    console.log("User logged in successfully:", loggedInUser);

    const options = {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, options);
    console.log('Cookies Set:');
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "user logged in successfully"
            )
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httponly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(401, "invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "refresh token is expired or used")
    }

    const options = {
        httponly: true,
        secure: true
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "access token refreshed successfully"
            )
        )
})

const changeCurrentPassword = asyncHandler(async (req, res) => { //working
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    console.log("Password changed successfully for user:", user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "password changed successfully"
            )
        )
})

const getCurrentUser = asyncHandler(async (req, res) => { //working
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => { //working
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    console.log("Account details updated successfully:", user);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "account updated successfully"
            )
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => { //working todo:delete old avatar from cloudinary
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "error while uploading on avatar")
    }

    const result = await deletefromCloudinary(req.user.avatar, "image")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    console.log("Avatar updated successfully:", user);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "avatar updated successfully"
            )
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => { //working todo:delete old cover image from cloudinary
    const CoverLocalPath = req.file?.path

    if (!CoverLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(CoverLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "error while uploading on avatar")
    }

    const result = await deletefromCloudinary(req.user.coverImage, "image")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    console.log("Cover image updated successfully:", user);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "cover image updated successfully"
            )
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => { //working
    const { userId } = req.params;

    if (!userId?.trim()) {
        throw new ApiError(400, "userId is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(userId))
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    console.log("User channel fetched successfully:", channel[0]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "user channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => { //working
    try {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(`${req.user._id}`)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            userName: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $arrayElemAt: ["$owner", 0]
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        if (user.length === 0) {
            throw new ApiError(404, "User watch history not found");
        }

        console.log("Watch history fetched successfully:", user[0].watchHistory);

        return res.status(200).json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "internal server error while fetching watch history", error)
    }
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}