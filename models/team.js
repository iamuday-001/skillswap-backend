import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: true,
      index: true,
    },
    members: [
      {
        email: { type: String, required: true },
        role: {
          type: String,
          enum: ["owner", "member"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    messages: [
      {
        senderEmail: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// 🔍 Optimize for member lookups
teamSchema.index({ "members.email": 1 });

// Prevent OverwriteModelError in dev
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

export default Team;
