import mongoose from "mongoose";

const recurringRuleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["expense", "income"], default: "expense" },

    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: "" },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

    dayOfMonth: { type: Number, required: true, min: 1, max: 28 }, // keep safe for all months
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

recurringRuleSchema.index({ user: 1, isActive: 1 });

export default mongoose.model("RecurringRule", recurringRuleSchema);
