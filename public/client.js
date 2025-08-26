const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const typingDiv = document.getElementById("typing");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");

let myLastMessage = null;
let typingTimeout;
const typingUsers = new Set();

// get room number from URL
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomName.innerText = "Room: " + room;

// join room
socket.emit("joinRoom", room);

// Send message
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

// Add message
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

  messages.appendChild(wrapper);

  // ✅ use helper autoscroll
  autoScroll();

  return wrapper;
}

// ✅ Auto-scroll helper
function autoScroll() {
  messages.scrollTo({
    top: messages.scrollHeight,
    behavior: "smooth"
  });
}

// Seen event
socket.on("seen", function() {
  if (myLastMessage) {
    const stat = myLastMessage.querySelector(".status");
    if (stat) stat.innerText = "Seen";
  }
});

// Typing logic
input.addEventListener("input", () => {
  socket.emit("typing", room);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", room);
  }, 1000);
});

socket.on("typing", (data) => {
  typingUsers.add(data.id);
  updateTypingDiv();
});

socket.on("stopTyping", (data) => {
  typingUsers.delete(data.id);
  updateTypingDiv();
});

function updateTypingDiv() {
  if (typingUsers.size === 0) {
    typingDiv.innerText = "";
  } else if (typingUsers.size === 1) {
    typingDiv.innerText = "User is typing...";
  } else {
    typingDiv.innerText = "Multiple users are typing...";
  }
}

// Update participants
socket.on("participants", (count) => {
  participantsSpan.innerText = count;
});
