const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10 * 1024 * 1024 // 10 MB
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const rooms = {};
const NTFY_TOPIC_URL = "https://ntfy.sh/dailynotes0327";

// Clean up old files every 10 minutes
setInterval(() => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > 5 * 60 * 1000) { // older than 5 minutes
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 10 * 60 * 1000);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join room
  socket.on("joinRoom", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    io.to(room).emit("participants", rooms[room].size);

    // ✅ System message to chat
    io.to(room).emit("system-message", `🟢 A user joined the chat`);

    // ✅ ntfy notification
    axios.post(NTFY_TOPIC_URL, `🟢 A user joined: ${room} (ID: ${socket.id})`)
      .catch(() => {}); 
  });

  // Chat message
  socket.on("chat message", (msg) => io.to(msg.room).emit("chat message", msg));

  // Seen
  socket.on("seen", (data) => io.to(data.room).emit("seen"));

  // Typing indicators
  socket.on("typing", (room) => socket.to(room).emit("typing", { id: socket.id }));
  socket.on("stopTyping", (room) => socket.to(room).emit("stopTyping", { id: socket.id }));

  // Send photo
  socket.on("send-photo", ({ data, name, room }) => {
    try {
      const matches = data.match(/^data:(image\/jpeg|image\/png);base64,(.+)$/);
      if (!matches) return;

      const ext = matches[1].split("/")[1];
      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) return;

      const filename = crypto.randomBytes(8).toString("hex") + "." + ext;
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.writeFile(filePath, buffer, (err) => {
        if (!err) io.to(room).emit("receive-photo", { url: `/uploads/${filename}`, sender: "User" });
      });
    } catch (e) {}
  });

  // Send voice
  socket.on("send-voice", ({ data, room }) => {
    try {
      const matches = data.match(/^data:(audio\/webm);base64,(.+)$/);
      if (!matches) return;

      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) return;

      const filename = crypto.randomBytes(8).toString("hex") + ".webm";
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.writeFile(filePath, buffer, (err) => {
        if (!err) io.to(room).emit("receive-voice", { url: `/uploads/${filename}`, sender: "User" });
      });
    } catch (e) {}
  });

  // Clear chat
  socket.on("clear-chat", (room) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
      if (err) return;
      files.forEach(file => fs.unlink(path.join(UPLOAD_DIR, file), () => {}));
    });
    io.to(room).emit("chat-cleared");
  });

  // Disconnect
  socket.on("disconnecting", () => {
    for (let room of socket.rooms) {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        io.to(room).emit("participants", rooms[room].size);

        // ✅ System message to chat
        io.to(room).emit("system-message", `🔴 A user left the chat`);

        // ✅ ntfy notification
        axios.post(NTFY_TOPIC_URL, `🔴 A user left: ${room} (ID: ${socket.id})`)
          .catch(() => {});
      }
    }
  });
});

// Serve uploads securely
app.use("/uploads", express.static(UPLOAD_DIR, { index: false, dotfiles: "deny" }));

// ---------------- Render Dynamic Port ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
