import mongoose, { Schema } from "mongoose";

const caSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
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
