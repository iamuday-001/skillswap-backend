// server/routes/notificationRoutes.js
import express from "express";
import Notification from "../models/notification.js";

const router = express.Router();

// ✅ Get notifications for a user
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ message: "Missing or invalid email param" });
    }

    const notifs = await Notification.find({ userEmail: email.trim() })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifs);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mark a single notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notif);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mark all notifications as read for a user
router.put("/mark-all-read", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Missing or invalid email" });
    }

    await Notification.updateMany(
      { userEmail: email.trim(), read: false },
      { $set: { read: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
