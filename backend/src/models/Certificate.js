import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
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
  issuedAt: {
    type: Date,
    default: null,
  },
  certificateId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  eligibilityStatus: {
    type: String,
    enum: ["ineligible", "eligible", "issued"],
    default: "ineligible",
    required: true,
  },
}, { timestamps: true });

certificateSchema.path("eligibilityStatus").validate(function validateIssuance(status) {
  if (status === "issued") {
    return Boolean(this.issuedAt && this.certificateId);
  }
  return !this.issuedAt;
}, "Issued certificates require an issue date and certificate ID; unissued certificates cannot have an issue date.");

certificateSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);
