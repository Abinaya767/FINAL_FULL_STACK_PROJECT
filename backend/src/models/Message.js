import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
