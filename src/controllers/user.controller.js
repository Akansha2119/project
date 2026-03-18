import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists:username,email
  // check for images,check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entery in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);
  if (
    [fullName, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new APIError(400, "All fields are required");
  }
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new APIError(409, "User already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required");
  }
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new APIError(400, "Avatar file is required");
  }
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });
  const createdUser = User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registration");
  }
  return res
    .status(201)
    .json(new APIResponse(200, createdUser, "user register successfully"));
});

export { registerUser };
