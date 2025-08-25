const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (your client)
app.use(express.static(path.join(__dirname, "public")));

// Storage setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // save in uploads folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Routes for photo upload
app.post("/upload/photo", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No photo uploaded" });
  res.json({ file: `/uploads/${req.file.filename}` });
});

// Routes for voice upload
app.post("/upload/voice", upload.single("voice"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No voice uploaded" });
  res.json({ file: `/uploads/${req.file.filename}` });
});

// Expose uploads folder publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.io chat handling
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("photo", (fileUrl) => {
    io.emit("photo", fileUrl);
  });

  socket.on("voice note", (fileUrl) => {
    io.emit("voice note", fileUrl);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
