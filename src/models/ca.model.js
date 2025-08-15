import mongoose, { Schema } from "mongoose";

const caSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  collegeName: {
    type: String,
    required: true,
    trim: true,
  },
  collegeYear: {
    type: String,
    required: true,
    trim: true,
  },
  por: {
    type: String,
    trim: true,
  },
  collegeAddress: {
    type: String,
    trim: true,
    required:true
  },
  phoneNumber: {
    type: String,
    trim: true,
    required:true
  },
  alternativeEmail: {
    type: String,
    trim: true,
  },
  howDidYouKnow: {
    type: String,
    enum: [
      "Instagram",
      "WhatsApp Channel",
      "UNSTOP",
      "Friends",
      "News",
      "YouTube",
      "Facebook",
      "Others",
    ],
    required: true,
  },
  applicationStatement: {
    type: String,
    required: true,
    trim: true,
  },
  applicationDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    required: true,
    default: "pending",
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
  },
});

caSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    ["accepted", "rejected"].includes(this.status)
  ) {
    this.reviewedAt = new Date();
  }
  next();
});

export const Ca = mongoose.model("Ca", caSchema);
