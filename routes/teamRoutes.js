// server/routes/teamRoutes.js
import express from "express";
import Team from "../models/team.js";
import Notification from "../models/notification.js";
import JoinRequest from "../models/joinRequest.js";
import Idea from "../models/idea.js";

const router = express.Router();

// Get team details
router.get("/:teamId", async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate(
      "ideaId",
      "ideaName description"
    );
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add message to chat (still supported via REST)
router.post("/:teamId/messages", async (req, res) => {
  try {
    const { senderEmail, text } = req.body;
    if (!senderEmail || !text)
      return res.status(400).json({ error: "Missing fields" });

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const newMessage = { senderEmail, text, createdAt: new Date() };
    team.messages.push(newMessage);
    await team.save();

    // Optionally emit via io if available (for non-socket clients)
    const io = req.app.get("io");
    if (io) {
      io.to(String(team._id)).emit("receiveMessage", {
        ...newMessage,
        teamId: String(team._id),
      });
    }

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all teams for a user
router.get("/user/:email", async (req, res) => {
  try {
    const teams = await Team.find({
      "members.email": req.params.email,
    }).populate("ideaId", "ideaName description");
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member (owner only) — Updated: notify + emit event
router.delete("/:teamId/members/:email", async (req, res) => {
  try {
    const { teamId, email } = req.params;
    const team = await Team.findById(teamId).populate("ideaId", "ideaName");
    if (!team) return res.status(404).json({ error: "Team not found" });

    const ideaName = team.ideaId?.ideaName || "the project";

    // Remove from team
    const wasMember = team.members.some((m) => m.email === email);
    if (!wasMember) {
      return res.status(400).json({ error: "User is not a member" });
    }

    team.members = team.members.filter((m) => m.email !== email);
    await team.save();

    // Remove from idea's members and decrement membersFilled if present
    await Idea.findByIdAndUpdate(team.ideaId, {
      $pull: { members: { email: email } },
      $inc: { membersFilled: -1 },
    });

    // Notify removed member
    await Notification.create({
      userEmail: email,
      title: "Removed from team",
      message: `You have been removed from the project "${ideaName}".`,
      link: "/explore",
      read: false,
    });

    // Delete any pending or accepted requests for that user on this idea
    await JoinRequest.deleteMany({
      ideaId: team.ideaId,
      requesterEmail: email,
      status: { $in: ["pending", "accepted"] },
    });

    // Emit socket event so connected members and removed user can react
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(String(team._id)).emit("memberRemoved", {
          email,
          teamId: String(team._id),
        });

        // Also notify the room with a system message (optional)
        const systemMsg = {
          senderEmail: "system",
          text: `${email} was removed from the team.`,
          createdAt: new Date(),
        };
        await Team.findByIdAndUpdate(team._id, {
          $push: { messages: systemMsg },
        });
        io.to(String(team._id)).emit("receiveMessage", {
          ...systemMsg,
          teamId: String(team._id),
        });
      }
    } catch (err) {
      console.error("Error emitting memberRemoved:", err);
    }

    res.json({ success: true, message: "Member removed and notified" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
