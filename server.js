const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const rooms = {}; // { roomCode: Set(socket.id) }

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  let joinedRoom = null;

  socket.on("join", (roomCode) => {
    joinedRoom = roomCode;
    socket.join(roomCode);

    if (!rooms[roomCode]) {
      rooms[roomCode] = new Set();
    }

    rooms[roomCode].add(socket.id);

    // Send participant count
    io.to(roomCode).emit("participants", rooms[roomCode].size);

    // Notify others
    socket.to(roomCode).emit("partner_joined");

    // Notify YOU via ntfy (if first user)
    if (rooms[roomCode].size === 1) {
      axios.post("https://ntfy.sh/dailynotes-alert", {
        topic: "dailynotes-alert",
        message: `Someone joined room ${roomCode}.`,
      }).catch(err => console.error("ntfy error:", err.message));
    }

    // Send flower
    socket.emit("flower", getRandomFlower());
  });

  socket.on("message", ({ room, text, sender }) => {
    socket.to(room).emit("message", { text, sender: "them" });
    socket.emit("message", { text, sender: "you" });
  });

  socket.on("leave", () => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom].delete(socket.id);
      io.to(joinedRoom).emit("participants", rooms[joinedRoom].size);
      io.to(joinedRoom).emit("partner_left");
      socket.leave(joinedRoom);
    }
  });

  socket.on("disconnect", () => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom].delete(socket.id);
      io.to(joinedRoom).emit("participants", rooms[joinedRoom].size);
      io.to(joinedRoom).emit("partner_left");
    }
  });
});

function getRandomFlower() {
  const flowers = ["🌸", "🌺", "🌼", "🌷", "🌹", "💐"];
  const picked = flowers[Math.floor(Math.random() * flowers.length)];
  return picked;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
