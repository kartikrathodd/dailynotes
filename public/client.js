const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

// Send text messages
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
  }
});

// Receive text messages
socket.on("chat message", (msg) => {
  const item = document.createElement("li");
  item.textContent = msg;
  messages.appendChild(item);
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

  socket.emit("photo", data.file);
});

// Receive photo
socket.on("photo", (fileUrl) => {
  const item = document.createElement("li");
  const img = document.createElement("img");
  img.src = fileUrl;
  img.width = 200;
  item.appendChild(img);
  messages.appendChild(item);
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

      socket.emit("voice note", data.file);
      recordBtn.textContent = "🎤 Record";
    };
  } else {
    mediaRecorder.stop();
  }
});

// Receive voice note
socket.on("voice note", (fileUrl) => {
  const item = document.createElement("li");
  const audio = document.createElement("audio");
  audio.src = fileUrl;
  audio.controls = true;
  item.appendChild(audio);
  messages.appendChild(item);
});
