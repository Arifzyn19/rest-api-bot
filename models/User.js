import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  number: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  apikey: { type: String },
  limit: { type: Number, default: 25 },
  profile: { type: String },
  isAdmin: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  premiumTime: { type: Number, default: 0 },
  defaultKey: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
