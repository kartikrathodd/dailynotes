const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

let participants = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (username) => {
    participants[socket.id] = username;
    io.emit("participants", Object.values(participants));
  });

  socket.on("chatMessage", (msg) => {
    io.emit("message", { user: participants[socket.id], text: msg, type: "text" });
  });

  socket.on("imageMessage", (filePath) => {
    io.emit("message", { user: participants[socket.id], text: filePath, type: "image" });
  });

  socket.on("voiceMessage", (filePath) => {
    io.emit("message", { user: participants[socket.id], text: filePath, type: "audio" });
  });

  socket.on("disconnect", () => {
    delete participants[socket.id];
    io.emit("participants", Object.values(participants));
  });
});

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
