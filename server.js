const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");
const multer = require("multer");

app.use(express.static(path.join(__dirname, "public")));

// File upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Route for uploading images
app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ filePath: "/uploads/" + req.file.filename });
});

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("chat message", (msg) => {
    io.emit("chat message", { id: socket.id, text: msg });
  });

  socket.on("image message", (filePath) => {
    io.emit("image message", { id: socket.id, filePath });
  });

  socket.on("voice message", (audioUrl) => {
    io.emit("voice message", { id: socket.id, audioUrl });
  });

  socket.on("seen", () => {
    io.emit("seen", { id: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
