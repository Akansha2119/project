// import { Router } from "express";
// import { upload } from "../middleware/multer.middleware.js";

// const router = Router();

// // 🔥 TEMP DEBUG ROUTE
// router.post("/register", upload.any(), (req, res) => {
//   console.log("HEADERS:", req.headers);
//   console.log("FILES:", req.files);
//   console.log("BODY:", req.body);

//   res.send("Check terminal");
// });

// export default router;

import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
export default router;
