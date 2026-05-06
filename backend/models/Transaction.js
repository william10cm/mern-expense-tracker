import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: ["expense", "income"], default: "expense" }, // optional income support

    amount: { type: Number, required: true, min: 0 },

    description: { type: String, trim: true, default: "" },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

    date: { type: Date, required: true }, // we’ll filter by month using this

    recurringRule: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringRule", default: null }
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);
