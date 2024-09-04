import mongoose from "mongoose";

const dailyRequestSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false },
);

const requestSchema = new mongoose.Schema({
  totalRequests: {
    type: Number,
    required: true,
    default: 0,
  },
  todayRequests: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  dailyRequests: [dailyRequestSchema], // Nested schema for daily requests
});

const Request = mongoose.model("Request", requestSchema);

export default Request;
