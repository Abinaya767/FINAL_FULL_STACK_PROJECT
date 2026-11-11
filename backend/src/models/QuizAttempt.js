import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    index: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true,
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
    index: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  progress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Progress",
    required: true,
  },
  attemptedAt: {
    type: Date,
    required: true,
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
}, { timestamps: true });

quizAttemptSchema.index({ student: 1, module: 1, attemptedAt: -1 });
quizAttemptSchema.index({ progress: 1, attemptedAt: -1 });

export default mongoose.models.QuizAttempt || mongoose.model("QuizAttempt", quizAttemptSchema);
