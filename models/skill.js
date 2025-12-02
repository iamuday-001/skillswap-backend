import mongoose from "mongoose";

const skillSchema = new mongoose.Schema({
  // ✅ Teach fields
  skillName: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  availability: { type: String, required: true },
  experience: { type: String, required: true },
  email: { type: String, required: true },

  // ✅ Learn fields (new)
  learnSkill: { type: String }, // what they want to learn
  learnCategory: { type: String }, // optional category
  learnLevel: { type: String }, // Beginner / Intermediate / Advanced
});

const Skill = mongoose.model("Skill", skillSchema);
export default Skill;
