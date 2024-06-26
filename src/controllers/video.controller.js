import mongoose, { isValidObjectId } from "mongoose";
import { video } from "../model/video.model.js";
import { user } from "../model/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const queryObject = {};
  if (query) {
    queryObject.title = { $regex: query, $options: 'i' }; // Example: search by video title
  }
  if (userId) {
    queryObject.userId = userId; // Filter by userId if provided
  }

  const sortOptions = {};
  if (sortBy) {
    sortOptions[sortBy] = sortType === 'asc' ? 1 : -1;
  }

  const Videos = await video.find(queryObject).sort(sortOptions).skip((pageNumber - 1) * limitNumber).limit(limitNumber);

  if(!Videos) {
    throw new apiError(404, 'Videos not found');
  }

  res.status(200).json(new apiResponse(200, Videos, "Videos fetched successfully"));

});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description} = req.body;
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
  const Video = await video.findById(videoId);
  if (!Video) {
    throw new apiError(404, 'Video not found');
  }
  res.status(200).json(new apiResponse(200, Video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description} = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!title) {
    throw new apiError(400, "Title is required");
  }

  if (!description) {
    throw new apiError(400, "Description is required");
  }

  if (!thumbnailLocalPath) {
    throw new apiError(400, "Thumbnail is required");
  }

  const currentVideo = await video.findById(videoId);

  if (!currentVideo) {
    return res.status(404).json(new apiResponse(404, null, "Video not found"));
  }

  const previousThumbnailPublicId = currentVideo.thumbnail;

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail.secure_url) {
    throw new apiError(400, "Failed to upload thumbnail");
  }
  const Video = await video
    .findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: thumbnail.secure_url,
        },
      },
      {
        new: true,
      }
    )
    .select("-password")
    .then(() => {
      deleteFromCloudinary(previousThumbnailPublicId);
    });

  res.status(200).json(new apiResponse(200, Video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const deletedVideo = await video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new apiError(404, 'Video not found');
  }
  res.status(200).json(new apiResponse(200, deletedVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const Video = await video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: false,
      },
    }
  );
  if (!Video) {
    throw new apiError(404, 'Video not found');
  }

});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
