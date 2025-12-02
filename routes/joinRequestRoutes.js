// server/routes/joinRequestRoutes.js
import express from "express";
import JoinRequest from "../models/joinRequest.js";
import Idea from "../models/idea.js";
import User from "../models/user.js";
import Team from "../models/team.js";
import Notification from "../models/notification.js";

const router = express.Router();

/**
 * Send a join request
 */
router.post("/", async (req, res) => {
  try {
    const { ideaId, requesterEmail, ownerEmail } = req.body;

    if (!ideaId || !requesterEmail || !ownerEmail) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    if (requesterEmail === ownerEmail) {
      return res
        .status(400)
        .json({ message: "Owner cannot request to join own idea" });
    }

    // Block only if there's a pending or accepted request (prevents duplicate)
    const existing = await JoinRequest.findOne({
      ideaId,
      requesterEmail,
      status: { $in: ["pending", "accepted"] },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Request already exists or active" });
    }

    const request = new JoinRequest({
      ideaId,
      requesterEmail,
      ownerEmail,
      status: "pending",
    });
    await request.save();

    // notify owner
    await Notification.create({
      userEmail: ownerEmail,
      title: "New join request",
      message: `${requesterEmail} requested to join your project "${idea.ideaName}"`,
      link: `/requests`,
      read: false,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get incoming requests (owner)
 */
router.get("/owner", async (req, res) => {
  try {
    const { email } = req.query;
    const requests = await JoinRequest.find({ ownerEmail: email }).populate(
      "ideaId"
    );

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const user = await User.findOne({ email: r.requesterEmail }).select(
          "username email"
        );
        return {
          ...r.toObject(),
          requesterName: user ? user.username : r.requesterEmail,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get requests sent (requester)
 */
router.get("/requester", async (req, res) => {
  try {
    const { email } = req.query;
    const requests = await JoinRequest.find({ requesterEmail: email }).populate(
      "ideaId"
    );

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const owner = await User.findOne({ email: r.ownerEmail }).select(
          "username email"
        );
        return {
          ...r.toObject(),
          ownerName: owner ? owner.username : r.ownerEmail,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Accept / Reject a request
 */
router.put("/:id", async (req, res) => {
  try {
    const io = req.app.get("io");
    const { status } = req.body;
    const request = await JoinRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    request.status = status;
    await request.save();

    let teamId = null;

    if (status === "accepted") {
      const idea = await Idea.findById(request.ideaId);

      // update idea with new member
      await Idea.findByIdAndUpdate(request.ideaId, {
        $inc: { membersFilled: 1 },
        $addToSet: {
          members: { email: request.requesterEmail, joinedAt: new Date() },
        },
      });

      // create or update team
      let team = await Team.findOne({ ideaId: request.ideaId });

      if (!team) {
        team = new Team({
          ideaId: request.ideaId,
          members: [
            { email: idea.email, role: "owner" },
            { email: request.requesterEmail, role: "member" },
          ],
        });
      } else {
        const alreadyMember = team.members.some(
          (m) => m.email === request.requesterEmail
        );
        if (!alreadyMember) {
          team.members.push({
            email: request.requesterEmail,
            role: "member",
          });
        }
      }
      await team.save();
      teamId = team._id;

      // notify requester
      await Notification.create({
        userEmail: request.requesterEmail,
        title: "Request accepted",
        message: `You have been accepted into "${idea.ideaName}".`,
        link: `/workspace/${team._id}`,
        read: false,
      });

      // Emit a socket event to the team room that a new member joined
      try {
        if (io && teamId) {
          io.to(String(teamId)).emit("memberJoined", {
            email: request.requesterEmail,
            teamId: String(teamId),
          });
        }
      } catch (err) {
        console.error("Error emitting memberJoined:", err);
      }
    }

    if (status === "rejected") {
      const idea = await Idea.findById(request.ideaId).select("ideaName");
      await Notification.create({
        userEmail: request.requesterEmail,
        title: "Request rejected",
        message: `Your request to join "${
          idea?.ideaName || "the project"
        }" was rejected.`,
        link: `/explore`,
        read: false,
      });
    }

    res.json({ request, teamId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark requests as seen
 */
router.put("/mark-seen", async (req, res) => {
  try {
    const { email } = req.body;
    await JoinRequest.updateMany(
      { ownerEmail: email, seen: false },
      { $set: { seen: true } }
    );
    res.json({ message: "Requests marked as seen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
