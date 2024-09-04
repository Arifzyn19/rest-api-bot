import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  unique_code: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  userType: { type: String, required: true },
  amount: { type: Number, required: true },
  create_at: { type: Date, required: true },
  expired: { type: Date, required: true },
  qr_data: { type: String, required: true },
  status: { type: String, required: true, default: "UNPAID" },
  receipt: { type: String, required: true },
  checkout_url: { type: String, required: true },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
