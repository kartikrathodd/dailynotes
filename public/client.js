const socket = io();

// Elements
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages");
const userListContainer = document.getElementById("user-list");
const imageInput = document.getElementById("image-input");
const imageButton = document.getElementById("image-button");
const recordButton = document.getElementById("record-button");

let mediaRecorder;
let audioChunks = [];
let username = prompt("Enter your name:") || "Guest";

socket.emit("join", username);

// Add message to chat
function appendMessage(message, type, isOwn) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type, isOwn ? "own" : "other");
  msgDiv.innerHTML = message;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Text messages
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    socket.emit("chatMessage", { username, message });
    appendMessage(`<b>${username}:</b> ${message}`, "text", true);
    messageInput.value = "";
  }
});

socket.on("chatMessage", (data) => {
  if (data.username !== username) {
    appendMessage(`<b>${data.username}:</b> ${data.message}`, "text", false);
  }
});

// Image messages
imageButton.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append("image", file);

    fetch("/upload", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        socket.emit("imageMessage", { username, image: data.filePath });
        appendMessage(
          `<b>${username}:</b> <img src="${data.filePath}" class="chat-image">`,
          "image",
          true
        );
      });
  }
});

socket.on("imageMessage", (data) => {
  if (data.username !== username) {
    appendMessage(
      `<b>${data.username}:</b> <img src="${data.image}" class="chat-image">`,
      "image",
      false
    );
  }
});

// Voice messages
recordButton.addEventListener("mousedown", () => {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("voice", audioBlob, "voice.webm");

      fetch("/voice", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((data) => {
          socket.emit("voiceMessage", { username, voice: data.filePath });
          appendMessage(
            `<b>${username}:</b> <audio controls src="${data.filePath}"></audio>`,
            "voice",
            true
          );
        });
    });
  });
});

recordButton.addEventListener("mouseup", () => {
  if (mediaRecorder) mediaRecorder.stop();
});

socket.on("voiceMessage", (data) => {
  if (data.username !== username) {
    appendMessage(
      `<b>${data.username}:</b> <audio controls src="${data.voice}"></audio>`,
      "voice",
      false
    );
  }
});

// User list
socket.on("userList", (users) => {
  userListContainer.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    userListContainer.appendChild(li);
  });
});
