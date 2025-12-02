import express from "express";
import Idea from "../models/idea.js";

const router = express.Router();

// Post a new idea
router.post("/", async (req, res) => {
  try {
    const idea = new Idea(req.body);
    await idea.save();
    res.status(201).json(idea);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all ideas
router.get("/", async (req, res) => {
  try {
    const ideas = await Idea.find();
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ideas by user email (createdBy)
router.get("/user", async (req, res) => {
  try {
    const { email } = req.query;
    const ideas = await Idea.find({ createdBy: email });
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete idea by ID
router.delete("/:id", async (req, res) => {
  try {
    await Idea.findByIdAndDelete(req.params.id);
    res.json({ message: "Idea deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; // ✅ important
