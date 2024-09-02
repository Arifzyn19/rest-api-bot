import config from "./config.js";
import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUrl = config.mongoUrl;

  if (!mongoUrl) {
    console.error(
      "MONGO_URL is not defined in environment variables or the provided connection string is invalid.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

export default connectDB;
