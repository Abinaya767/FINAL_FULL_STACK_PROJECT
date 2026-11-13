import mongoose from "mongoose";

const assessmentQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (options) => options.length === 4 && options.every((option) => typeof option === "string" && option.trim()),
      message: "Each final assessment question must have exactly four non-empty options.",
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

const assessmentSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    unique: true,
  },
  questions: {
    type: [assessmentQuestionSchema],
    required: true,
    validate: {
      validator: (questions) => questions.length >= 20 && questions.length <= 30,
      message: "A final assessment must contain between 20 and 30 questions.",
    },
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 20,
    max: 30,
    validate: {
      validator(value) {
        return Number.isInteger(value) && value === this.questions.length;
      },
      message: "totalQuestions must match the number of assessment questions.",
    },
  },
  passingPercentage: {
    type: Number,
    required: true,
    default: 50,
    min: 50,
    max: 100,
  },
}, { timestamps: true });

export default mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
