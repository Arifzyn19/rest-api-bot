import mongoose from "mongoose";

const changelogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
});

export default mongoose.model("Changelog", changelogSchema);
