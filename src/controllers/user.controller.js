import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/ApiError.js";
import { user } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async(userId) => {
  try {
    const User = await user.findById(userId);
    const accessToken = User.generateAccessToken();
    const refreshToken = User.generateRefreshToken();
    User.refreshToken = refreshToken;
    // It will not overwrite other fields
    await User.save({validateBeforeSave: false});
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, "Something went wrong while generating access and refresh token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if ([fullName, email, username, password].some((field) => field?.trim()==="")) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await user.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
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
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  await newUser.save();
  const createdUser = await user
    .findById(newUser._id)
    .select("-password -refreshToken");

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating user");
  }

  res
    .status(201)
    .json(new apiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body ---> data
  const { username, email, password } = req.body;
  // for login we need username or email
  if (!username || !email && !password) {
    throw new apiError(400, "Username or password is required");
  }
  // find user
  const User = await user.findOne({ 
    $or: [{ username }, { email }] 
  });

  if (!User) {
    throw new apiError(404, "User not found");
  }  
  // password check
  const isPasswordCorrect = await User.isPasswordCorrect(password);
  if(!isPasswordCorrect){
    throw new apiError(401, "Username or password is incorrect");
  }
  // access token and refresh token generate
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(User._id);
  const loggedInUser = await user.findById(User._id).select("-password -refreshToken");
  // send refresh token and save in cookie
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  }
  res
  .status(200).
  cookie("refreshToken", refreshToken, cookieOptions)
  .cookie("accessToken", accessToken, cookieOptions)
  .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User Logged in Successfully"
      )
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  await user.findByIdAndUpdate(
    // from auth middleware
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true,
    }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  }
  res
  .status(200)
  .clearCookie("accessToken", cookieOptions)
  .clearCookie("refreshToken", cookieOptions)
  .json(
    new apiResponse(200, null, "User logged out successfully")
  );
});

export { 
  registerUser, 
  loginUser, 
  logoutUser 
};
