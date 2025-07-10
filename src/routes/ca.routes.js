import express from "express";
import {
  applyForCa,
  getMyCaApplication,
  acceptCaApplication,
  rejectCaApplication,
} from "../controllers/ca.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

const router = express.Router();

router.post("/apply", verifyToken, authorizeRole("user"), applyForCa);

router.get("/application", verifyToken, getMyCaApplication);

router.put(
  "/:id/accept",
  verifyToken,
  authorizeRole("admin", "moderator"),
  acceptCaApplication
);

router.put(
  "/:id/reject",
  verifyToken,
  authorizeRole("admin", "moderator"),
  rejectCaApplication
);

export default router;
