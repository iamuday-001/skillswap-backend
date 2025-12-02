import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: true,
    },
    requesterEmail: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "kicked", "removed"],
      default: "pending",
    },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const JoinRequest =
  mongoose.models.JoinRequest ||
  mongoose.model("JoinRequest", joinRequestSchema);

export default JoinRequest;
