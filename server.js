const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public")); // Serve static files

const roomUsers = {};

io.on("connection", socket => {
  socket.on("join", room => {
    socket.join(room);
    socket.room = room;

    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room].push(socket.id);

    socket.to(room).emit("partner_joined");
  });

  socket.on("message", data => {
    io.to(data.room).emit("message", data.text);
  });

  socket.on("disconnect", () => {
    if (socket.room && roomUsers[socket.room]) {
      roomUsers[socket.room] = roomUsers[socket.room].filter(id => id !== socket.id);
      if (roomUsers[socket.room].length === 0) delete roomUsers[socket.room];
    }
  });
});

http.listen(3000, () => console.log("Server running on http://localhost:3000"));
