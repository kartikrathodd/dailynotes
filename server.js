const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const rooms = {};

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = [];
    if (!rooms[room].includes(socket.id)) rooms[room].push(socket.id);

    socket.to(room).emit("status", "🔔 Someone joined the room.");
    io.to(room).emit("participants", rooms[room].length);
  });

  socket.on("message", ({ room, text }) => {
    socket.to(room).emit("message", { text, from: "them" });
    socket.emit("message", { text, from: "you" });
  });

  socket.on("leave", (room) => {
    socket.leave(room);
    if (rooms[room]) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
      socket.to(room).emit("status", "🚪 Someone left the room.");
      io.to(room).emit("participants", rooms[room].length);
    }
  });

  socket.on("disconnecting", () => {
    const joinedRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    joinedRooms.forEach((room) => {
      if (rooms[room]) {
        rooms[room] = rooms[room].filter(id => id !== socket.id);
        socket.to(room).emit("status", "🚪 Someone left the room.");
        io.to(room).emit("participants", rooms[room].length);
      }
    });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server is running");
});

