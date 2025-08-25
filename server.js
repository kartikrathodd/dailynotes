const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// --- Upload Routes ---

// Upload Photo
app.post("/upload/photo", upload.single("photo"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });
});

// Upload Voice Note
app.post("/upload/voice", upload.single("voice"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });
});

// --- Socket.IO Events ---
io.on("connection", (socket) => {
  console.log("A user connected");

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
    console.log("A user disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
