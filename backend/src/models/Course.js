import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  instructor: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  duration: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  level: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  modules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
  }],
}, { timestamps: true });

courseSchema.path("modules").validate({
  validator: (modules) => modules.length >= 10,
  message: "A course must reference at least 10 modules.",
});

courseSchema.path("modules").validate({
  validator: (modules) => new Set(modules.map(String)).size === modules.length,
  message: "A course cannot reference the same module more than once.",
});

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
