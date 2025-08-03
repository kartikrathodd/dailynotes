const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const TELEGRAM_BOT_TOKEN = "7949867945:AAGV8IzWc9jbtEOZJ9Xo2-1V_DMgyhZ4Aw0";
const TELEGRAM_USER_ID = "1419108159";

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
    
    // Alert owner via Telegram only if room code is "0327"
    if (room === "0327") {
      axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_USER_ID,
        text: `🟢 Someone joined the DailyNotes room with code 0327.`,
      }).catch((err) => console.error("Telegram error:", err));
    }

    // Notify others in the room
    socket.to(room).emit("partner_joined");
    
    // Listen for messages in the room
    socket.on("message", (data) => {
      io.to(data.room).emit("message", data.text);
    });
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // or notes.html if renamed
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
