import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // we can add an isBlocked to our model
    // if (user.isBlocked) {
    //   return res.status(403).json({ msg: 'User is blocked' });
    // }

    req.user = user;

    next();
  } catch (error) {
    console.error("verifyToken error:", error.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};
