import mongoose from "mongoose";

export const QUIZ_ATTEMPT_LIMIT = 2;
export const QUIZ_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (options) => options.length >= 2 && options.every((option) => option.trim()),
      message: "Each question must have at least two non-empty options.",
    },
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator(value) {
        return Number.isInteger(value) && value < this.options.length;
      },
      message: "The correct answer must identify an existing option.",
    },
  },
}, { _id: true });

const quizSchema = new mongoose.Schema({
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
    unique: true,
  },
  attemptLimit: {
    type: Number,
    enum: [QUIZ_ATTEMPT_LIMIT],
    default: QUIZ_ATTEMPT_LIMIT,
    immutable: true,
  },
  cooldownMs: {
    type: Number,
    enum: [QUIZ_COOLDOWN_MS],
    default: QUIZ_COOLDOWN_MS,
    immutable: true,
  },
  questions: {
    type: [questionSchema],
    required: true,
    validate: {
      validator: (questions) => questions.length === 5,
      message: "Every module quiz must contain exactly 5 questions.",
    },
  },
}, { timestamps: true });

export default mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
