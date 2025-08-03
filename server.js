const axios = require("axios");
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

const ROOM_CODE = "0327";

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);

    if (room === ROOM_CODE) {
      // Send push notification using ntfy
      axios.post("https://ntfy.sh/dailynotes0327", {
        headers: { "Title": "👀 Someone joined your secret room" },
      }).catch((err) => console.log("ntfy error:", err));
    }

    socket.to(room).emit("partner_joined");

    socket.on("message", (data) => {
      socket.to(data.room).emit("message", data.text);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

