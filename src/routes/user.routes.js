import express from "express";
import { getMe } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"

const userRouter = express.Router();

userRouter.get("/me", verifyToken, getMe);

export default userRouter;
