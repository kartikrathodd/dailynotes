const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const typingDiv = document.getElementById("typing");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");

let myLastMessage = null;
let typingTimeout;

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
