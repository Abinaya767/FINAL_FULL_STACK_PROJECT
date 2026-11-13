import mongoose from "mongoose";

const assessmentAttemptSchema = new mongoose.Schema({
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
    required: true,
    index: true,
  },
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
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assessment",
    required: true,
  },
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
  terminated: {
    type: Boolean,
    default: false,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

assessmentAttemptSchema.index({ enrollment: 1, attemptedAt: -1 });
assessmentAttemptSchema.index({ student: 1, course: 1, attemptedAt: -1 });

export default mongoose.models.AssessmentAttempt || mongoose.model("AssessmentAttempt", assessmentAttemptSchema);
