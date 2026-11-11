import mongoose from "mongoose";
import { hashPassword } from "../utils/password.js";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["student", "admin"], default: "student", required: true },
}, { timestamps: true });
userSchema.pre("save", async function hashChangedPassword() {
  if (this.isModified("passwordHash") && !this.passwordHash.startsWith("scrypt$")) {
    this.passwordHash = await hashPassword(this.passwordHash);
  }
});
userSchema.index({ email: 1 }, { unique: true });
export default mongoose.models.User || mongoose.model("User", userSchema);
