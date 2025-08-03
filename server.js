const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const roomUsers = {};

function sendNtfy(message) {
  fetch("https://ntfy.sh/dailynotes0327", {
    method: "POST",
    body: message,
    headers: { "Content-Type": "text/plain" }
  }).catch((err) => console.error("ntfy error:", err));
}

io.on("connection", (socket) => {
  let currentRoom = "";
  let currentUser = "";
  let hasLeft = false;

  socket.on("join", ({ room, userID }) => {
    if (!room || !userID) return;

    // Prevent duplicate joins
    if (socket.data.hasJoined) return;
    socket.data.hasJoined = true;

    currentRoom = room;
    currentUser = userID;
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = new Set();
    roomUsers[room].add(userID);

    const msg = `🟢 User ${userID} joined room ${room}`;
    io.to(room).emit("system", msg);
    io.to(room).emit("user_count", roomUsers[room].size);
    sendNtfy(msg); // 🔔
  });

  socket.on("message", ({ room, text, sender }) => {
    io.to(room).emit("message", { text, sender });
  });

  socket.on("leave", ({ room, userID }) => {
    if (roomUsers[room]) {
      roomUsers[room].delete(userID);
      if (roomUsers[room].size === 0) delete roomUsers[room];
      else io.to(room).emit("user_count", roomUsers[room].size);
    }
    const msg = `🔴 User ${userID} left room ${room}`;
    io.to(room).emit("system", msg);
    sendNtfy(msg); // 🔔
    hasLeft = true;
  });

  socket.on("disconnect", () => {
    if (!hasLeft && currentRoom && currentUser && roomUsers[currentRoom]) {
      roomUsers[currentRoom].delete(currentUser);
      if (roomUsers[currentRoom].size === 0) delete roomUsers[currentRoom];
      else io.to(currentRoom).emit("user_count", roomUsers[currentRoom].size);

      const msg = `🔴 User ${currentUser} disconnected from room ${currentRoom}`;
      io.to(currentRoom).emit("system", msg);
      sendNtfy(msg); // 🔔
    }
  });
});

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
