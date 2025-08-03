const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const TELEGRAM_BOT_TOKEN = '7949867945:AAGV8IzWc9jbtEOZJ9Xo2-1V_DMgyhZ4Aw0';
const TELEGRAM_USER_ID = '1419108159';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  socket.on('joinRoom', (room) => {
    socket.join(room);

    // 🔔 Telegram alert only when room 0327 is joined
    if (room === '0327') {
      axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_USER_ID,
        text: '🔐 She has entered secret room 0327 on DailyNotes!',
      }).catch((err) => {
        console.error('Telegram error:', err.message);
      });
    }
  });

  socket.on('chatMessage', ({ room, message }) => {
    socket.to(room).emit('chatMessage', message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
