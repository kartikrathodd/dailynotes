const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// File upload config (for photos & voice notes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes for uploading photos/voice (NO auto delete now)
app.post("/upload/photo", upload.single("photo"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });
});

app.post("/upload/voice", upload.single("voice"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= SOCKET.IO =====================
let users = {}; // store connected users { socket.id : username }

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  // User joins chat
  socket.on("join", (username) => {
    users[socket.id] = username;
    io.emit("participants", Object.values(users)); // send updated user list
  });

  // Chat message
  socket.on("chat message", (data) => {
    // data = { text, sender }
    io.emit("chat message", { ...data, status: "delivered" });
  });

  // Seen event
  socket.on("seen", (msgId) => {
    io.emit("seen", msgId); // broadcast seen update
  });

  // Voice note
  socket.on("voice note", (fileUrl) => {
    io.emit("voice note", { fileUrl, status: "delivered" });
  });

  // Photo
  socket.on("photo", (fileUrl) => {
    io.emit("photo", { fileUrl, status: "delivered" });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    delete users[socket.id];
    io.emit("participants", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
