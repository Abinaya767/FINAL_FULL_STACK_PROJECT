import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000,
  },
  order: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
  }],
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    default: null,
  },
}, { timestamps: true });

moduleSchema.index({ course: 1, order: 1 }, { unique: true });

export default mongoose.models.Module || mongoose.model("Module", moduleSchema);
