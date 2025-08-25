const socket = io();
const msgInput = document.getElementById("msg");
const messagesDiv = document.getElementById("messages");
const sendBtn = document.getElementById("send");
const fileInput = document.getElementById("file");
const cameraBtn = document.getElementById("camera");
const voiceBtn = document.getElementById("voice");

let username = prompt("Enter your name:") || "User";
socket.emit("join", username);

sendBtn.onclick = () => {
  if (msgInput.value.trim()) {
    let msgId = Date.now().toString();
    socket.emit("chatMessage", { text: msgInput.value, from: username, msgId, type: "text" });
    msgInput.value = "";
  }
};

// Upload image
cameraBtn.onclick = () => fileInput.click();
fileInput.onchange = async () => {
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  let msgId = Date.now().toString();
  socket.emit("chatMessage", { from: username, msgId, type: "image", url: data.filePath });
};

// Voice note
let mediaRecorder, audioChunks = [];
voiceBtn.onclick = async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    voiceBtn.innerText = "⏹";

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      let blob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];

      const formData = new FormData();
      formData.append("file", blob, "voice.webm");
      const res = await fetch("/upload", { method: "POST", body: formData });
      const data = await res.json();

      let msgId = Date.now().toString();
      socket.emit("chatMessage", { from: username, msgId, type: "audio", url: data.filePath });
      voiceBtn.innerText = "🎤";
    };

    setTimeout(() => mediaRecorder.stop(), 5000); // auto stop in 5s
  }
};

// Render message
socket.on("chatMessage", msg => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from === username ? "sent" : "received");

  if (msg.type === "text") div.innerHTML = msg.text;
  if (msg.type === "image") div.innerHTML = `<img src="${msg.url}" alt="image">`;
  if (msg.type === "audio") div.innerHTML = `<audio controls src="${msg.url}"></audio>`;

  // seen status
  div.innerHTML += `<div class="seen" id="seen-${msg.msgId}"></div>`;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Send seen back
  if (msg.from !== username) {
    socket.emit("messageSeen", msg.msgId);
  }
});

// Update seen
socket.on("messageSeen", data => {
  let seenDiv = document.getElementById("seen-" + data.msgId);
  if (seenDiv) seenDiv.innerText = "Seen ✔";
});
