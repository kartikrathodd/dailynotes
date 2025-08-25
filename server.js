const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    io.to(room).emit("participants", rooms[room].size);
  });

  socket.on("chat message", (msg) => {
    io.to(msg.room).emit("chat message", msg);
  });

  socket.on("seen", (data) => {
    io.to(data.room).emit("seen");
  });

  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
  });

  socket.on("stopTyping", (room) => {
    socket.to(room).emit("stopTyping");
  });

  socket.on("disconnecting", () => {
    for (let room of socket.rooms) {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        io.to(room).emit("participants", rooms[room].size);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
