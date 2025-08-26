const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const axios = require("axios"); // ✅ axios for ntfy notifications

const PORT = process.env.PORT || 3000;
const NTFY_URL = "https://ntfy.sh/dailynotes0327";

// Serve static files
app.use(express.static("public"));

// Entry page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Track participants per room
const participants = {};

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // User joins a room
  socket.on("joinRoom", (room) => {
    socket.join(room);

    if (!participants[room]) participants[room] = 0;
    participants[room]++;

    // Notify all clients in room
    io.to(room).emit("participants", participants[room]);
    io.to(room).emit("chat message", "🟢 A user joined the room");

    // 🔔 Send ntfy notification
    axios.post(NTFY_URL, `🟢 A user joined room: ${room}`, {
      headers: { "Content-Type": "text/plain" }
    }).catch((err) => console.error("ntfy error:", err.message));

    console.log(`👤 User ${socket.id} joined room ${room}`);
  });

  // User sends chat message
  socket.on("chat message", (msg) => {
    io.to(msg.room).emit("chat message", msg);
  });

  // Seen message
  socket.on("seen", (data) => {
    io.to(data.room).emit("seen");
  });

  // Typing indicator
  socket.on("typing", (room) => {
    socket.to(room).emit("typing", { id: socket.id });
  });

  socket.on("stopTyping", (room) => {
    socket.to(room).emit("stopTyping", { id: socket.id });
  });

  // Clear chat
  socket.on("clear-chat", (room) => {
    io.to(room).emit("chat-cleared");
  });

  // Send photo
  socket.on("send-photo", (msg) => {
    io.to(msg.room).emit("receive-photo", { url: msg.data, sender: socket.id });
  });

  // Send voice
  socket.on("send-voice", (msg) => {
    io.to(msg.room).emit("receive-voice", { url: msg.data, sender: socket.id });
  });

  // Disconnect handler
  socket.on("disconnecting", () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);

    rooms.forEach((room) => {
      if (participants[room]) {
        participants[room]--;

        io.to(room).emit("participants", participants[room]);
        io.to(room).emit("chat message", "🔴 A user left the room");

        // 🔔 Send ntfy notification
        axios.post(NTFY_URL, `🔴 A user left room: ${room}`, {
          headers: { "Content-Type": "text/plain" }
        }).catch((err) => console.error("ntfy error:", err.message));

        console.log(`🔴 User ${socket.id} left room ${room}`);
      }
    });
  });
});

http.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
