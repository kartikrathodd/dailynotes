const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const participantsList = document.getElementById("participants");

// Get username for this session
let username = prompt("Enter your name:") || "Anonymous";

// Send text messages
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    const messageData = {
      user: username,
      text: input.value,
      status: "delivered", // default status
    };
    socket.emit("chat message", messageData);
    input.value = "";
  }
});

// Receive text messages
socket.on("chat message", (msg) => {
  renderMessage(msg);
});

// Handle photo upload
const photoInput = document.getElementById("photoInput");
photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch("/upload/photo", { method: "POST", body: formData });
  const data = await res.json();

  const photoData = {
    user: username,
    photo: data.file,
    status: "delivered",
  };

  socket.emit("photo", photoData);
});

// Receive photo
socket.on("photo", (data) => {
  renderMessage(data);
});

// Voice Recording
let mediaRecorder;
let audioChunks = [];
const recordBtn = document.getElementById("recordBtn");

recordBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    recordBtn.textContent = "⏹ Stop";

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];

      const formData = new FormData();
      formData.append("voice", audioBlob, "voiceNote.webm");

      const res = await fetch("/upload/voice", { method: "POST", body: formData });
      const data = await res.json();

      const voiceData = {
        user: username,
        voice: data.file,
        status: "delivered",
      };

      socket.emit("voice note", voiceData);
      recordBtn.textContent = "🎤 Record";
    };
  } else {
    mediaRecorder.stop();
  }
});

// Receive voice note
socket.on("voice note", (data) => {
  renderMessage(data);
});

// Participants list
socket.emit("join", username);
socket.on("participants", (users) => {
  participantsList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    participantsList.appendChild(li);
  });
});

// Mark as seen when message enters viewport
function renderMessage(data) {
  const item = document.createElement("div");
  item.classList.add("message");
  item.classList.add(data.user === username ? "sent" : "received");

  // Text message
  if (data.text) {
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    bubble.textContent = data.text;

    const status = document.createElement("span");
    status.classList.add("status");
    status.textContent = data.user === username ? data.status : "";
    bubble.appendChild(status);

    item.appendChild(bubble);
  }

  // Photo
  if (data.photo) {
    const img = document.createElement("img");
    img.src = data.photo;
    img.classList.add("photo");
    item.appendChild(img);
  }

  // Voice
  if (data.voice) {
    const audio = document.createElement("audio");
    audio.src = data.voice;
    audio.controls = true;
    item.appendChild(audio);
  }

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}
