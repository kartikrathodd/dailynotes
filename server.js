const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const uploadsDir = path.join(__dirname, "uploads"); // move uploads outside public
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.static(path.join(__dirname, "public"))); // public for css/js/html

// Serve uploaded files securely
app.get("/uploads/:file", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

const rooms = {};
const tempMessages = {};

const NTFY_TOPIC_URL = "https://ntfy.sh/dailynotes0327";

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join room
  socket.on("joinRoom", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    io.to(room).emit("participants", rooms[room].size);

    const joinMessage = `🟢 A user has joined room: ${room} (ID: ${socket.id})`;
    axios.post(NTFY_TOPIC_URL, joinMessage).catch(err => console.error(err));
  });

  // Chat message
  socket.on("chat message", (msg) => {
    if (!tempMessages[msg.room]) tempMessages[msg.room] = [];
    tempMessages[msg.room].push({ msg, timestamp: Date.now() });

    io.to(msg.room).emit("chat message", msg);

    // auto-cleanup after 5 min
    setTimeout(() => {
      cleanupMessages(msg.room);
    }, 5 * 60 * 1000);
  });

  // Photo upload
  socket.on("send-photo", (data) => {
    const base64Data = data.data.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `${Date.now()}-${data.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFile(filePath, base64Data, "base64", (err) => {
      if (err) console.error(err);
      else {
        const msg = { type: "photo", url: `/uploads/${fileName}`, room: data.room, sender: socket.id };
        if (!tempMessages[data.room]) tempMessages[data.room] = [];
        tempMessages[data.room].push({ msg, timestamp: Date.now() });
        io.to(data.room).emit("receive-photo", msg);

        setTimeout(() => cleanupMessages(data.room), 5 * 60 * 1000);
      }
    });
  });

  // Voice note upload
  socket.on("send-voice", (data) => {
    const base64Data = data.data.replace(/^data:audio\/\w+;base64,/, "");
    const fileName = `${Date.now()}-voice.webm`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFile(filePath, base64Data, "base64", (err) => {
      if (err) console.error(err);
      else {
        const msg = { type: "voice", url: `/uploads/${fileName}`, room: data.room, sender: socket.id };
        if (!tempMessages[data.room]) tempMessages[data.room] = [];
        tempMessages[data.room].push({ msg, timestamp: Date.now() });
        io.to(data.room).emit("receive-voice", msg);

        setTimeout(() => cleanupMessages(data.room), 5 * 60 * 1000);
      }
    });
  });

  // Clear chat manually
  socket.on("clear-chat", (room) => {
    tempMessages[room] = [];

    // Delete files from uploads folder
    fs.readdir(uploadsDir, (err, files) => {
      if (err) console.error(err);
      for (const file of files) {
        fs.unlink(path.join(uploadsDir, file), err => { if(err) console.error(err); });
      }
    });

    io.to(room).emit("chat-cleared");
  });

  // Seen
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

        const leaveMessage = `🔴 A user has left room: ${room} (ID: ${socket.id})`;
        axios.post(NTFY_TOPIC_URL, leaveMessage).catch(err => console.error(err));
      }
    }
  });
});

// Helper: clean old messages
function cleanupMessages(room) {
  if (!tempMessages[room]) return;
  const now = Date.now();
  tempMessages[room] = tempMessages[room].filter(m => now - m.timestamp < 5 * 60 * 1000);
}

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
