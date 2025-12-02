import mongoose from "mongoose";

const ideaSchema = new mongoose.Schema(
  {
    ideaName: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    teamSize: { type: Number, required: true },
    membersFilled: { type: Number, default: 1 },
    skillsNeeded: { type: String, required: true },
    rolesNeeded: { type: String, required: true },
    level: { type: String, enum: ["Beginner", "Intermediate", "Expert"] },
    email: { type: String, required: true },
    members: [
      {
        email: { type: String, required: true },
        role: { type: String, default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Idea = mongoose.models.Idea || mongoose.model("Idea", ideaSchema);

export default Idea;
