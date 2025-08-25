const socket = io();
const form = document.getElementById("chat-form");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typingDiv = document.getElementById("typing");

let username = "You";
let typingTimeout;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const msg = {
      id: Date.now(),
      user: username,
      text: input.value,
      type: "text",
      seen: false,
    };
    appendMessage(msg, true);
    socket.emit("chat message", msg);
    input.value = "";
    socket.emit("stop typing", username);
  }
});

input.addEventListener("input", () => {
  socket.emit("typing", username);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop typing", username);
  }, 1000);
});

socket.on("chat message", (msg) => {
  appendMessage(msg, false);
});

socket.on("message sent", (msg) => {
  markSeen(msg.id);
});

socket.on("message seen", (msgId) => {
  const el = document.querySelector(`[data-id="${msgId}"] .status`);
  if (el) el.textContent = "Seen";
});

socket.on("typing", (name) => {
  typingDiv.textContent = `${name} is typing...`;
});

socket.on("stop typing", () => {
  typingDiv.textContent = "";
});

function appendMessage(msg, isOwn) {
  const item = document.createElement("li");
  item.classList.add("message", isOwn ? "own" : "other");
  item.dataset.id = msg.id;

  if (msg.type === "text") {
    item.innerHTML = `<p>${msg.text}</p><span class="status">${isOwn ? "Sent" : ""}</span>`;
  } else if (msg.type === "file") {
    item.innerHTML = `<img src="${msg.text}" class="chat-img"/><span class="status">${isOwn ? "Sent" : ""}</span>`;
  } else if (msg.type === "audio") {
    item.innerHTML = `<audio controls src="${msg.text}"></audio><span class="status">${isOwn ? "Sent" : ""}</span>`;
  }

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;

  if (!isOwn) {
    socket.emit("message seen", msg.id);
  }
}

function markSeen(id) {
  const el = document.querySelector(`[data-id="${id}"] .status`);
  if (el) el.textContent = "Seen";
}
