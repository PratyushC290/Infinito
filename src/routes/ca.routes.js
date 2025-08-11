import express from "express";
import {
  applyForCa,
  getMyCaApplication,
  acceptCaApplication,
  rejectCaApplication,
} from "../controllers/ca.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

const caRouter = express.Router();

caRouter.post("/apply", verifyToken, 
  // authorizeRole("user"),
   applyForCa);

caRouter.get("/application", verifyToken, getMyCaApplication);

caRouter.put(
  "/:id/accept",
  verifyToken,
  authorizeRole("admin", "moderator"),
  acceptCaApplication
);

caRouter.put(
  "/:id/reject",
  verifyToken,
  authorizeRole("admin", "moderator"),
  rejectCaApplication
);

export default caRouter;