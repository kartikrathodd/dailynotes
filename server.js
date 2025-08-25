const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const axios = require("axios"); // For ntfy notifications

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

// Replace this with your ntfy topic URL
const NTFY_TOPIC_URL = "https://ntfy.sh/your-topic";

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a room
  socket.on("joinRoom", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    io.to(room).emit("participants", rooms[room].size);

    // Send ntfy notification when a user joins
    const joinMessage = `🟢 A user has joined the room: ${room} (ID: ${socket.id})`;
    axios.post(NTFY_TOPIC_URL, joinMessage)
      .then(() => console.log("ntfy join notification sent"))
      .catch(err => console.error("ntfy error:", err));
  });

  // Chat message
  socket.on("chat message", (msg) => {
    io.to(msg.room).emit("chat message", msg);
  });

  // Seen message
  socket.on("seen", (data) => {
    io.to(data.room).emit("seen");
  });

  // Typing indicators
  socket.on("typing", (room) => {
    socket.to(room).emit("typing", { id: socket.id });
  });

  socket.on("stopTyping", (room) => {
    socket.to(room).emit("stopTyping", { id: socket.id });
  });

  // Disconnecting
  socket.on("disconnecting", () => {
    for (let room of socket.rooms) {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        io.to(room).emit("participants", rooms[room].size);

        // Send ntfy notification when a user disconnects
        const leaveMessage = `🔴 A user has left the room: ${room} (ID: ${socket.id})`;
        axios.post(NTFY_TOPIC_URL, leaveMessage)
          .then(() => console.log("ntfy leave notification sent"))
          .catch(err => console.error("ntfy error:", err));
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
