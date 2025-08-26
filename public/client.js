const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");

const clearBtn = document.getElementById("clear-chat-btn");
const photoInput = document.getElementById("photo-input");
const voiceBtn = document.getElementById("voice-btn");

let myLastMessage = null;
let typingTimeout;
const typingIndicators = {};
const lastMessageByUser = {};

// get room number from URL
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomName.innerText = "Room: " + room;

// join room
socket.emit("joinRoom", room);

// -------------------- SEND TEXT MESSAGE --------------------
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
    removeTypingIndicator(msg.sender);
    addMessage(msg, "received");
    socket.emit("seen", { room, sender: msg.sender });
  }
});

// Add message bubble
function addMessage(msg, type) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", type);
  wrapper.innerText = msg.text;

  if (type === "sent") {
    const stat = document.createElement("div");
    stat.classList.add("status");
    stat.innerText = "Delivered";
    wrapper.appendChild(stat);
  }

  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateY(20px)";
  wrapper.style.transition = "all 0.3s ease";

  messages.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.style.opacity = "1";
    wrapper.style.transform = "translateY(0)";
  });

  lastMessageByUser[msg.sender] = wrapper;

  autoScroll();
  return wrapper;
}

function autoScroll() {
  messages.scrollTo({
    top: messages.scrollHeight + 80,
    behavior: "smooth"
  });
}

// -------------------- SEEN STATUS --------------------
socket.on("seen", function() {
  if (myLastMessage) {
    const stat = myLastMessage.querySelector(".status");
    if (stat) stat.innerText = "Seen";
  }
});

// -------------------- TYPING INDICATORS --------------------
input.addEventListener("input", () => {
  socket.emit("typing", room);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", room);
  }, 1000);
});

socket.on("typing", (data) => {
  if (!typingIndicators[data.id]) {
    const indicator = document.createElement("div");
    indicator.classList.add("typing-indicator");
    indicator.innerText = "Typing...";

    const lastMsg = lastMessageByUser[data.id];
    if (lastMsg && lastMsg.nextSibling) {
      messages.insertBefore(indicator, lastMsg.nextSibling);
    } else {
      messages.appendChild(indicator);
    }

    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(15px)";
    indicator.style.transition = "all 0.3s ease";
    requestAnimationFrame(() => {
      indicator.style.opacity = "1";
      indicator.style.transform = "translateY(0)";
    });

    typingIndicators[data.id] = indicator;
  }
  autoScroll();
});

socket.on("stopTyping", (data) => {
  removeTypingIndicator(data.id);
});

function removeTypingIndicator(id) {
  if (typingIndicators[id]) {
    const indicator = typingIndicators[id];
    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(15px)";
    setTimeout(() => {
      if (indicator.parentNode) messages.removeChild(indicator);
    }, 300);
    delete typingIndicators[id];
  }
}

// -------------------- PARTICIPANTS --------------------
socket.on("participants", (count) => {
  participantsSpan.innerText = count;
});

// -------------------- CLEAR CHAT --------------------
clearBtn.addEventListener("click", () => {
  messages.innerHTML = "";
  socket.emit("clear-chat", room);
});

socket.on("chat-cleared", () => {
  messages.innerHTML = "";
});

// -------------------- PHOTO UPLOAD --------------------
photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("send-photo", { data: reader.result, name: file.name, room });
  };
  reader.readAsDataURL(file);
});

// -------------------- VOICE NOTE --------------------
let mediaRecorder;
let audioChunks = [];

voiceBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("send-voice", { data: reader.result, room });
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.start();
    voiceBtn.textContent = "⏹️"; // stop icon
  } else if (mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    voiceBtn.textContent = "🎤"; // reset icon
  }
});

// -------------------- RECEIVE PHOTO --------------------
socket.on("receive-photo", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message", msg.sender === socket.id ? "sent" : "received");
  div.innerHTML = `<img src="${msg.url}" style="max-width:70%; border-radius:10px;">`;
  messages.appendChild(div);
  autoScroll();
});

// -------------------- RECEIVE VOICE --------------------
socket.on("receive-voice", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message", msg.sender === socket.id ? "sent" : "received");
  div.innerHTML = `<audio controls src="${msg.url}"></audio>`;
  messages.appendChild(div);
  autoScroll();
});
