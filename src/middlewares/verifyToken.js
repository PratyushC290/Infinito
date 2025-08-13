import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("verifyToken error:", error.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};