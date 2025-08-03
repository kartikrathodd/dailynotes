const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

const PORT = process.env.PORT || 3000;

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static("public"));

// Send index or entry page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Track rooms and their users
const roomUsers = {};

io.on("connection", socket => {
  let currentRoom = "";
  let currentUser = "";

  socket.on("join", ({ room, userID }) => {
    currentRoom = room;
    currentUser = userID;
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = new Set();
    roomUsers[room].add(userID);

    io.to(room).emit("system", `🟢 A user joined the room`);
    io.to(room).emit("user_count", roomUsers[room].size);
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
    io.to(room).emit("system", `🔴 A user left the room`);
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser && roomUsers[currentRoom]) {
      roomUsers[currentRoom].delete(currentUser);
      if (roomUsers[currentRoom].size === 0) delete roomUsers[currentRoom];
      else io.to(currentRoom).emit("user_count", roomUsers[currentRoom].size);
      io.to(currentRoom).emit("system", `🔴 A user disconnected`);
    }
  });
});

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
