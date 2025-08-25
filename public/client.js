const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const typingDiv = document.getElementById("typing");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");

// New Elements
const photoInput = document.getElementById("photoInput");
const photoBtn = document.getElementById("photoBtn");
const voiceBtn = document.getElementById("voiceBtn");

let myLastMessage = null;
let typingTimeout;
let mediaRecorder;
let audioChunks = [];

// get room number from URL
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomName.innerText = "Room: " + room;

// join room
socket.emit("joinRoom", room);

form.addEventListener("submit", function(e) {
  e.preventDefault();
  if (input.value) {
    const msg = { text: input.value, sender: socket.id, room: room };
    socket.emit("chat message", msg);
    myLastMessage = addMessage(msg, "sent");
    input.value = "";
  }
});

// Listen for messages
socket.on("chat message", function(msg) {
  if (msg.sender !== socket.id) {
    addMessage(msg, "received");
    socket.emit("seen", { room, sender: msg.sender });
  }
});

// Add message (supports text, image, audio)
function addMessage(msg, type) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", type);

  if (msg.text) {
    wrapper.innerText = msg.text;
  }
  if (msg.image) {
    const img = document.createElement("img");
    img.src = msg.image;
    img.style.maxWidth = "200px";
    img.style.borderRadius = "8px";
    wrapper.appendChild(img);
  }
  if (msg.audio) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = msg.audio;
    wrapper.appendChild(audio);
  }

  if (type === "sent" && (msg.text || msg.image || msg.audio)) {
    const stat = document.createElement("div");
    stat.classList.add("status");
    stat.innerText = "Delivered";
    wrapper.appendChild(stat);
  }

  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
  return wrapper;
}

// Seen event
socket.on("seen", function() {
  if (myLastMessage) {
    const stat = myLastMessage.querySelector(".status");
    if (stat) stat.innerText = "Seen";
  }
});

// Typing event
input.addEventListener("input", () => {
  socket.emit("typing", room);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", room);
  }, 1000);
});

socket.on("typing", () => {
  typingDiv.innerText = "User is typing...";
});

socket.on("stopTyping", () => {
  typingDiv.innerText = "";
});

// Update participants
socket.on("participants", (count) => {
  participantsSpan.innerText = count;
});


// ----------------- 📷 PHOTO UPLOAD -----------------
photoBtn.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const msg = { image: reader.result, sender: socket.id, room: room };
      socket.emit("chat message", msg);
      myLastMessage = addMessage(msg, "sent");
    };
    reader.readAsDataURL(file); // send as Base64
  }
});


// ----------------- 🎤 VOICE NOTE -----------------
voiceBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const msg = { audio: reader.result, sender: socket.id, room: room };
          socket.emit("chat message", msg);
          myLastMessage = addMessage(msg, "sent");
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      voiceBtn.innerText = "⏹"; // change icon to stop
    } catch (err) {
      console.error("Mic access denied", err);
    }
  } else {
    // Stop recording
    mediaRecorder.stop();
    voiceBtn.innerText = "🎤"; // reset icon
  }
});
