const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const fileInput = document.getElementById("fileInput");
const cameraBtn = document.getElementById("cameraBtn");
const recordBtn = document.getElementById("recordBtn");

let mediaRecorder;
let audioChunks = [];

// Add message to UI
function addMessage(msg, type, self) {
  const item = document.createElement("li");
  item.classList.add("message", self ? "sent" : "received", type);

  if (type === "text") {
    item.textContent = msg;
  } else if (type === "image") {
    const img = document.createElement("img");
    img.src = msg;
    img.classList.add("chat-image");
    item.appendChild(img);
  } else if (type === "voice") {
    const audio = document.createElement("audio");
    audio.src = msg;
    audio.controls = true;
    item.appendChild(audio);
  }

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

// Send text
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    addMessage(input.value, "text", true);
    input.value = "";
    socket.emit("seen");
  }
});

// Receive text
socket.on("chat message", (data) => {
  if (data.id !== socket.id) addMessage(data.text, "text", false);
});

// Upload image
cameraBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append("image", file);

    fetch("/upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        socket.emit("image message", data.filePath);
        addMessage(data.filePath, "image", true);
        socket.emit("seen");
      });
  }
});

// Receive image
socket.on("image message", (data) => {
  if (data.id !== socket.id) addMessage(data.filePath, "image", false);
});

// Voice recording
recordBtn.addEventListener("mousedown", async () => {
  if (navigator.mediaDevices.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    audioChunks = [];
    mediaRecorder.addEventListener("dataavailable", (e) => {
      audioChunks.push(e.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      socket.emit("voice message", audioUrl);
      addMessage(audioUrl, "voice", true);
      socket.emit("seen");
    });
  }
});

recordBtn.addEventListener("mouseup", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
});

// Receive voice
socket.on("voice message", (data) => {
  if (data.id !== socket.id) addMessage(data.audioUrl, "voice", false);
});

// Seen indicator
socket.on("seen", (data) => {
  if (data.id !== socket.id) {
    const seenMsg = document.createElement("div");
    seenMsg.textContent = "Seen ✔";
    seenMsg.classList.add("seen");
    messages.appendChild(seenMsg);
    messages.scrollTop = messages.scrollHeight;
  }
});
