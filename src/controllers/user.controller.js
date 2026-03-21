// import { asyncHandler } from "../utils/asyncHandler.js";
// import { APIError } from "../utils/APIError.js";
// import { User } from "../models/user.model.js";
// import { uploadCloudinary } from "../utils/cloudinary.js";
// import { APIResponse } from "../utils/APIResponse.js";

// const registerUser = asyncHandler(async (req, res) => {
//   console.log("FILES:", req.files);
//   console.log("BODY:", req.body);
//   // get user details from frontend
//   // validation - not empty
//   // check if user already exists:username,email
//   // check for images,check for avatar
//   // upload them to cloudinary, avatar
//   // create user object - create entery in db
//   // remove password and refresh token field from response
//   // check for user creation
//   // return res
//   const { fullName, email, username, password } = req.body;
//   console.log("email: ", email);
//   if (
//     [fullName, email, username, password].some((field) => field?.trim() == "")
//   ) {
//     throw new APIError(400, "All fields are required");
//   }
//   const existedUser = await User.findOne({
//     $or: [{ username }, { email }],
//   });
//   if (existedUser) {
//     throw new APIError(409, "User already exists");
//   }
//   const avatarLocalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;
//   if (!avatarLocalPath) {
//     throw new APIError(400, "Avatar file is required");
//   }
//   const avatar = await uploadCloudinary(avatarLocalPath);
//   const coverImage = await uploadCloudinary(coverImageLocalPath);
//   if (!avatar) {
//     throw new APIError(400, "Avatar file is required");
//   }
//   const user = await User.create({
//     fullName: fullName,
//     avatar: avatar.url,
//     coverImage: coverImage?.url || "",
//     password,
//     username: username.toLowerCase(),
//     email,
//   });
//   const createdUser = await User.findById(user._id).select(
//     "-password -refreshToken"
//   );
//   if (!createdUser) {
//     throw new APIError(500, "Something went wrong while registration");
//   }
//   return res
//     .status(201)
//     .json(new APIResponse(200, createdUser, "user register successfully"));
//   c;
// });

// export { registerUser };

import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new APIError(
      500,
      "Something went wrong while generating access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 🔍 Debug logs (you can remove later)
  // console.log("FILES:", req.files);
  // console.log("BODY:", req.body);

  // 1️⃣ Get user details
  const { fullName, email, username, password } = req.body;

  // 2️⃣ Validation
  if (
    [fullName, email, username, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new APIError(400, "All fields are required");
  }

  // 3️⃣ Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new APIError(409, "User already exists");
  }
  console.log(req.files);

  // 4️⃣ Get file paths (FIXED with optional chaining + path correction)
  const avatarLocalPath = req.files?.avatar?.[0]?.path?.replace(/\\/g, "/");
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path?.replace(
    /\\/g,
    "/"
  );

  // 5️⃣ Validate avatar
  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required");
  }

  // 6️⃣ Upload to Cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new APIError(400, "Avatar upload failed");
  }

  // 7️⃣ Create user
  const user = await User.create({
    fullName: fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
    email,
  });

  // 8️⃣ Remove sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registration");
  }

  // 9️⃣ Send response
  return res
    .status(201)
    .json(new APIResponse(200, createdUser, "User registered successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
  //req body ->data
  //username or email
  //find the user
  //password check
  //access and refresh token
  //send cookie
  const { email, username, password } = req.body;
  if (!username || !email) {
    throw new APIError(400, "username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new APIError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new APIError(401, "Invalid user");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggenInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToke", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user: loggenInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in SuccessFully"
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged Out"));
});

export { registerUser, loginUser, logoutUser };
