import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { user } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import  { apiResponse } from "../utils/apiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    // get details from frontend
    // validation - not empty
    // check if user already exists: username and email
    // check avatar and images
    // upload to cloudinary, avatar and images
    // create user object - create entry in database
    // remove pass and refresh token fields from response
    // check for user creation
    // send response
    const {
        fullName,
        username,
        email,
        password,
    } = req.body;
    console.log(fullName);
    // validation
    if( [fullName, username, email, password, avatar, images].some((field)=> field?.trim() === "" ) ){
        throw new apiError(400, "All fields are required");
    }
    // TODO: check if user already exists
    const userExists = await user.findOne({
        $or: [{username},{email}]
    });
    if(userExists){
        throw new apiError(409, "User with this email or username already exists");
    }
    const avatarLocalPath =req.files?.avatar[0]?.path;
    const coverImageLocalPath =req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    const User = await user.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });
    const createdUser = user.findByID(User._id).select("-password -refreshToken");
    if(!createdUser){
        throw new apiError(500, "Something went wrong while creating user");
    }
    return res.status(201).json(
        new apiResponse(200, createdUser, "User created successfully")
    );
});

export { registerUser };