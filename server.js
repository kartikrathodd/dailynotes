// ======= server.js =======
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
    socket.room = room;

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(socket.id);

    io.to(room).emit("participants", rooms[room].length);
    socket.to(room).emit("partner_joined");
  });

  socket.on("message", ({ room, text, sender }) => {
    io.to(room).emit("message", { text, sender });
  });

  socket.on("exit", () => {
    const room = socket.room;
    if (!room) return;
    socket.leave(room);

    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      io.to(room).emit("participants", rooms[room].length);
      socket.to(room).emit("partner_left");
      if (rooms[room].length === 0) delete rooms[room];
    }
  });

  socket.on("disconnect", () => {
    const room = socket.room;
    if (!room) return;
    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      io.to(room).emit("participants", rooms[room].length);
      socket.to(room).emit("partner_left");
      if (rooms[room].length === 0) delete rooms[room];
    }
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
