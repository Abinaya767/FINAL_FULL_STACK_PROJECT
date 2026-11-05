import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  bio: { type: String, trim: true, maxlength: 1000 },
  college: { type: String, trim: true, maxlength: 200 },
  department: { type: String, trim: true, maxlength: 200 },
  yearOfStudy: { type: Number, min: 1, max: 20 },
}, { _id: false });

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 32,
  },
  profile: {
    type: profileSchema,
    default: () => ({}),
  },
  enrollments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
  }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
