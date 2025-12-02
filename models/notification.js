import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true },
    title: { type: String, default: "" }, // optional short title
    message: { type: String, required: true }, // detailed text
    link: { type: String, default: "" }, // optional route (e.g. "/teams/:id")
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError in dev mode
const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
