import express from "express";
import Skill from "../models/skill.js";

const router = express.Router();

// ✅ Post a new skill (Teach + Learn)
router.post("/", async (req, res) => {
  try {
    const newSkill = new Skill(req.body); // saves teach + learn fields
    await newSkill.save();
    res.status(201).json(newSkill);
  } catch (err) {
    res.status(500).json({ message: "Error saving skill", error: err });
  }
});

// ✅ Get all skills OR by email
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    const skills = email ? await Skill.find({ email }) : await Skill.find();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: "Error fetching skills", error: err });
  }
});

// ✅ Update skill by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedSkill = await Skill.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // return updated document
    );

    if (!updatedSkill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.json(updatedSkill);
  } catch (err) {
    res.status(500).json({ message: "Error updating skill", error: err });
  }
});

// ✅ Delete skill by ID
router.delete("/:id", async (req, res) => {
  try {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: "Skill deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting skill", error: err });
  }
});

export default router;
