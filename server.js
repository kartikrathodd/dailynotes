const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static("public"));

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "update/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Image upload route
app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ filePath: `/update/${req.file.filename}` });
});

// Voice upload route
app.post("/voice", upload.single("voice"), (req, res) => {
  res.json({ filePath: `/update/${req.file.filename}` });
});

// Serve uploaded files
app.use("/update", express.static("update"));

let users = {};

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("join", (username) => {
    users[socket.id] = username;
    io.emit("userList", Object.values(users));
  });

  socket.on("chatMessage", (data) => {
    io.emit("chatMessage", data);
  });

  socket.on("imageMessage", (data) => {
    io.emit("imageMessage", data);
  });

  socket.on("voiceMessage", (data) => {
    io.emit("voiceMessage", data);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("userList", Object.values(users));
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
