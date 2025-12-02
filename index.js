// server/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import ideaRoutes from "./routes/ideaRoutes.js";
import joinRequestRoutes from "./routes/joinRequestRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://skillswap-frontend-mu.vercel.app",
    ],

    credentials: true,
  })
);

// Create Socket.io server and attach to httpServer
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://skillswap-frontend-mu.vercel.app",
    ],
    credentials: true,
  },
});

// Make io available to routes via app local
app.set("io", io);

// Socket events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinRoom", (teamId) => {
    if (!teamId) return;
    socket.join(teamId);
    console.log(`Socket ${socket.id} joined room ${teamId}`);
  });

  socket.on("leaveRoom", (teamId) => {
    if (!teamId) return;
    socket.leave(teamId);
    console.log(`Socket ${socket.id} left room ${teamId}`);
  });

  // Client emits sendMessage, server saves & broadcasts
  socket.on("sendMessage", async ({ teamId, senderEmail, text }) => {
    try {
      if (!teamId || !senderEmail || !text) return;

      // we update DB using Team model directly to ensure persistence
      const Team = (await import("./models/team.js")).default;
      const newMsg = { senderEmail, text, createdAt: new Date() };

      await Team.findByIdAndUpdate(teamId, { $push: { messages: newMsg } });

      // Broadcast to the team room
      io.to(teamId).emit("receiveMessage", { ...newMsg, teamId });
    } catch (err) {
      console.error("Error handling sendMessage:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// connect to mongo
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/requests", joinRequestRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
