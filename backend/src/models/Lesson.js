import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
}, { timestamps: true });

lessonSchema.index({ module: 1, order: 1 }, { unique: true });

export default mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);
