const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

// Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });
});

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("chat message", (msg) => {
    socket.broadcast.emit("chat message", { ...msg, seen: false });
    socket.emit("message sent", msg);
  });

  socket.on("message seen", (msgId) => {
    io.emit("message seen", msgId);
  });

  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  socket.on("stop typing", (username) => {
    socket.broadcast.emit("stop typing", username);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
