import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRouter from "./routes/user.routes.js";

const app = express();

// ✅ MIDDLEWARE FIRST
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));
app.use(cookieParser());

// ✅ ROUTES AFTER MIDDLEWARE
app.use("/api/v1/user", userRouter);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server working");
});

export { app };
