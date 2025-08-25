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

// Routes for uploading photos/voice
app.post("/upload/photo", upload.single("photo"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });

  // auto-delete after 1 min (disappearing photo)
  setTimeout(() => {
    fs.unlink(path.join(__dirname, "uploads", req.file.filename), (err) => {
      if (err) console.log("Delete error:", err);
    });
  }, 60000);
});

app.post("/upload/voice", upload.single("voice"), (req, res) => {
  res.json({ file: `/uploads/${req.file.filename}` });

  // auto-delete after 5 min (optional for voice)
  setTimeout(() => {
    fs.unlink(path.join(__dirname, "uploads", req.file.filename), (err) => {
      if (err) console.log("Delete error:", err);
    });
  }, 300000);
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// WebSockets
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("voice note", (fileUrl) => {
    io.emit("voice note", fileUrl);
  });

  socket.on("photo", (fileUrl) => {
    io.emit("photo", fileUrl);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
