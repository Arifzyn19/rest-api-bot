import mongoose from "mongoose";

const pluginUsageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  totalReq: {
    type: Number,
    required: true,
    default: 0,
  },
});

const PluginUsage = mongoose.model("PluginUsage", pluginUsageSchema);

export default PluginUsage;
