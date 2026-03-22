import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken";

// ================== TOKEN GENERATION ==================
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new APIError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    // ✅ FIX: await added
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new APIError(500, "Something went wrong while generating tokens");
  }
};

// ================== REGISTER USER ==================
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // ✅ Validation
  if (
    [fullName, email, username, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new APIError(400, "All fields are required");
  }

  // ✅ Check existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new APIError(409, "User already exists");
  }

  // ✅ File paths (safe optional chaining)
  const avatarLocalPath = req.files?.avatar?.[0]?.path?.replace(/\\/g, "/");
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path?.replace(
    /\\/g,
    "/"
  );

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required");
  }

  // ✅ Upload to cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new APIError(400, "Avatar upload failed");
  }

  // ✅ Create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
    email,
  });

  // ✅ Remove sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registration");
  }

  return res
    .status(201)
    .json(new APIResponse(200, createdUser, "User registered successfully"));
});

// ================== LOGIN USER ==================
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new APIError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new APIError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new APIError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false, // ✅ for localhost
    sameSite: "lax", // ✅ good practice
  };

  return res
    .status(200)
    .clearCookie("accessToke") // ✅ remove old wrong cookie (VERY IMPORTANT)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// ================== LOGOUT USER ==================
const logoutUser = asyncHandler(async (req, res) => {
  // ✅ Safety check
  if (!req.user?._id) {
    throw new APIError(401, "Unauthorized");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      // ✅ better than setting undefined
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: false, // ✅ for localhost
    sameSite: "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged out successfully"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (incomingRefreshToken) {
    throw new APIError(401, "Unauthorised request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new APIError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new APIError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: false, // ✅ for localhost
      sameSite: "lax",
    };
    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new APIResponse(
          200,
          { accessToken, newrefreshToken },
          "AccessToken refreshed"
        )
      );
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid erfresh token");
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
