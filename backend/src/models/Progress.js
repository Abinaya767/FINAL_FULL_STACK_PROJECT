import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
  attemptedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  scorePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  passed: {
    type: Boolean,
    required: true,
  },
}, { _id: true });

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
  },
  completionPercentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
    required: true,
  },
  unlockedAt: {
    type: Date,
    default: null,
  },
  quizAttempts: {
    type: [quizAttemptSchema],
    default: [],
    validate: {
      validator: (attempts) => attempts.length <= 2,
      message: "A student can have at most 2 quiz attempts in the current attempt window.",
    },
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

progressSchema.path("status").validate(function validateCompletion(status) {
  return (status === "completed") === (this.completionPercentage === 100);
}, "Completed progress must be 100%, and 100% progress must be completed.");

progressSchema.index({ student: 1, course: 1, module: 1 }, { unique: true });

export default mongoose.models.Progress || mongoose.model("Progress", progressSchema);
