import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: false,
    index: true,
  },
  recipientUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  senderUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: ["general", "message"],
    default: "general",
  },
  link: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  isRead: {
    type: Boolean,
    default: false,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
