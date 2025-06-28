import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  caId: {
    type: Schema.Types.ObjectId,
    ref: "Ca",
    required: true,
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  proofURLs: [
    {
      type: String,
      required: true,
    },
  ],
  commentsCA: { type: String, trim: true },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
  },
  reviewComments: { type: String, trim: true },
  pointsAwarded: { type: Number },
});

submissionSchema.pre("save", function (next) {
  if (this.isModified("pointsAwarded") && this.pointsAwarded != null) {
    this.reviewedAt = new Date();
  }
  next();
});

export const TaskSubmission = mongoose.model(
  "TaskSubmission",
  submissionSchema
);
