import { Router } from "express";
import {verifyToken} from '../middlewares/verifyToken.js'
import { healthcheck } from "../controllers/healthcheck.controllers.js";

const router = Router(); 
router.route("/").get(verifyToken,healthcheck);
export default router;