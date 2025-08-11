import { Ca } from "../models/ca.model.js";
import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";

export const applyForCa = CatchAsyncErrror(async (req, res) => {
  const userId = req.user._id;
  console.log(userId)
  const { applicationStatement } = req.body;

  if (!applicationStatement || applicationStatement.trim().length === 0) {
    return res.status(400).json({ msg: "Application statement is required" });
  }

  const existingApplication = await Ca.findOne({ userId });
  if (existingApplication) {
    return res.status(400).json({ msg: "You have already applied for CA" });
  }

  const application = new Ca({
    userId,
    applicationStatement: applicationStatement.trim(),
  });

  await application.save();

  return res.status(201).json({
    msg: "CA application submitted successfully",
    application,
  });
});

export const getMyCaApplication = CatchAsyncErrror(async (req, res) => {
  const userId = req.user._id;

  const application = await Ca.findOne({ userId });

  if (!application) {
    return res
      .status(404)
      .json({ msg: "No CA application found for this user." });
  }

  return res.status(200).json({ application });
});

export const acceptCaApplication = CatchAsyncErrror(async (req, res) => {
  const caId = req.params.id;
  const reviewerId = req.user._id;

  const application = await Ca.findById(caId);
  if (!application) {
    return res.status(404).json({ msg: "CA application not found" });
  }

  if (application.status !== "pending") {
    return res
      .status(400)
      .json({ msg: `Application already ${application.status}` });
  }

  application.status = "accepted";
  application.reviewedBy = reviewerId;
  application.reviewedAt = new Date();
  await application.save();
  console.log(application.userId)

  await User.findByIdAndUpdate(application.userId, { role: "ca" });

  return res.status(200).json({ msg: "Application accepted successfully" });
});

export const rejectCaApplication = CatchAsyncErrror(async (req, res) => {
  const caId = req.params.id;
  const reviewerId = req.user._id;
  console.log(req.user)

  const application = await Ca.findById(caId);
  if (!application) {
    return res.status(404).json({ msg: "CA application not found" ,caId,reviewerId});
  }

  if (application.status !== "pending") {
    return res
      .status(400)
      .json({ msg: `Application already ${application.status}` });
  }

  application.status = "rejected";
  application.reviewedBy = reviewerId;
  application.reviewedAt = new Date();
  await application.save();

  return res.status(200).json({ msg: "Application rejected successfully" });
});