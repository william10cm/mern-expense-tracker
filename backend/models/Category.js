import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, trim: true, default: "#64748b" } // optional, for charts/UI
  },
  { timestamps: true }
);

// Prevent duplicate category names per user (case-insensitive-ish)
categorySchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
