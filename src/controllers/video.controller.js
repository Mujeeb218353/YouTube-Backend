import mongoose, { isValidObjectId } from "mongoose";
import { video } from "../model/video.model.js";
import { user } from "../model/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description} = req.body;
  // TODO: get video, upload to cloudinary, create video
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!title) {
    throw new apiError(400, "Title is required");
  }

  if (!description) {
    throw new apiError(400, "Description is required");
  }

  if (!videoFileLocalPath) {
    throw new apiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new apiError(400, "Thumbnail file is required");
  }

  const videoFileUrl = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFileUrl ) {
    throw new apiError(500, "Video file not uploaded to Cloudinary");
  }

  if (!thumbnailUrl) {
    throw new apiError(500, "Thumbnail file not uploaded  to Cloudinary");
  }

  const Video = new video({
    title,
    description,
    videoFile: videoFileUrl.secure_url,
    thumbnail: thumbnailUrl.secure_url,
    duration: videoFileUrl.duration,
    owner: req.User._id,
  });

  const createdVideo = await Video.save();
  res.status(201).json(new apiResponse(200, createdVideo, "Video created successfully"));

});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
