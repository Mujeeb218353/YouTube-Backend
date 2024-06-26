import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { user } from "../model/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const User = await user.findById(userId);
    const accessToken = User.generateAccessToken();
    const refreshToken = User.generateRefreshToken();
    User.refreshToken = refreshToken;
    // It will not overwrite other fields
    await User.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await user.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(500, "Failed to upload files to Cloudinary");
  }

  const newUser = new user({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
  });

  await newUser.save();
  const createdUser = await user.findById(newUser._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating user");
  }

  res.status(201).json(new apiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body ---> data
  const { username, email, password } = req.body;
  // for login we need username or email
  if (!((username || email ) && password)) {
    throw new apiError(400, "Username or password is required");
  }
  // find user
  const User = await user.findOne({
    $or: [{ username }, { email }],
  });

  if (!User) {
    throw new apiError(404, "User not found");
  }
  // password check
  const isPasswordCorrect = await User.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new apiError(401, "Username or password is incorrect");
  }
  // access token and refresh token generate
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    User._id
  );
  const loggedInUser = await user
    .findById(User._id)
    .select("-password -refreshToken");
  // send refresh token and save in cookie
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await user.findByIdAndUpdate(
    // from auth middleware
    req.User?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new apiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const User = await user.findById(decodedToken?._id);

    if (!User) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== User?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(User._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const User = await user.findById(req.User?._id);
  const isPasswordCorrect = await User.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new apiError(401, "Old password is incorrect");
  }
  User.password = newPassword;
  await User.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new apiResponse(200, req.User, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, fullName } = req.body;
  if (!username || !fullName) {
    throw new apiError(400, "Username or Full Name is required");
  }
  req.User.username = username;
  req.User.fullName = fullName;
  const checkUserName = await user.findOne({ username });
  if (checkUserName) {
    throw new apiError(400, "Username is already taken");
  }
  const updatedUser = await user
    .findByIdAndUpdate(
      req.User?._id,
      {
        $set: {
          username,
          fullName,
        },
      },
      {
        new: true,
      }
    )
    .select("-password");
  res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.secure_url) {
    throw new apiError(400, "Failed to upload avatar");
  }

  const User = await user
    .findByIdAndUpdate(
      req.User?._id,
      {
        $set: {
          avatar: avatar.secure_url,
        },
      },
      {
        new: true,
      }
    )
    .select("-password")
    .then(() => {
      deleteFromCloudinary(req.User.avatar);
    });

  res
    .status(200)
    .json(new apiResponse(200, User, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover Image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.secure_url) {
    throw new apiError(400, "Failed to upload Cover Image");
  }

  const User = await user
    .findByIdAndUpdate(
      req.User?._id,
      {
        $set: {
          coverImage: coverImage.secure_url,
        },
      },
      {
        new: true,
      }
    )
    .select("-password")
    .then(() => {
      deleteFromCloudinary(req.User.coverImage);
    });

  res
    .status(200)
    .json(new apiResponse(200, User, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }
  const channel = await user.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new apiError(404, "Channel does not exist");
  }
  res
    .status(200)
    .json(new apiResponse(200, channel[0], "Channel fetched successfully"));
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const User = await user.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.User?._id),
      },
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
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        User[0].watchHistory,
        "Watch History fetched successfully"
      )
    );
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
  getUserWatchHistory,
};
