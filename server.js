const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.static("public"));

// Storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Image upload endpoint
app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ filePath: "/uploads/" + req.file.filename });
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Socket.IO
io.on("connection", (socket) => {
  console.log("a user connected");

  // Message
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  // Image
  socket.on("chat image", (imgPath) => {
    io.emit("chat image", imgPath);
  });

  // Audio
  socket.on("chat audio", (audioPath) => {
    io.emit("chat audio", audioPath);
  });

  // Typing
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  // Seen message
  socket.on("seen", (msgId) => {
    io.emit("seen", msgId);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
