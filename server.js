const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const multer = require("multer");
const path = require("path");

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File upload (images/audio)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ filePath: "/uploads/" + req.file.filename });
});

// Store connected users
let users = {};

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("join", username => {
    users[socket.id] = username;
    io.emit("userList", Object.values(users));
  });

  // Handle chat messages
  socket.on("chatMessage", msg => {
    io.emit("chatMessage", { ...msg, id: socket.id, time: new Date() });
  });

  // Handle seen
  socket.on("messageSeen", msgId => {
    io.emit("messageSeen", { msgId, seenBy: users[socket.id] });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("userList", Object.values(users));
    console.log("User disconnected:", socket.id);
  });
});

http.listen(3000, () => console.log("Server running on http://localhost:3000"));
