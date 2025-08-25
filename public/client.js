const socket = io();

// Join with random name
const username = "User" + Math.floor(Math.random() * 1000);
socket.emit("joinRoom", username);

const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const participantsList = document.getElementById("participantsList");
const cameraBtn = document.getElementById("cameraBtn");
const fileInput = document.getElementById("fileInput");
const micBtn = document.getElementById("micBtn");

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = msgInput.value;
  if (msg.trim() !== "") {
    socket.emit("chatMessage", msg);
    msgInput.value = "";
  }
}

socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.user === username ? "sent" : "received");

  if (msg.type === "text") {
    div.innerText = msg.text;
  } else if (msg.type === "image") {
    const img = document.createElement("img");
    img.src = msg.text;
    div.appendChild(img);
  } else if (msg.type === "audio") {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = msg.text;
    div.appendChild(audio);
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("participants", (list) => {
  participantsList.innerHTML = "";
  list.forEach((user) => {
    const li = document.createElement("li");
    li.innerText = user;
    participantsList.appendChild(li);
  });
});

// Handle image upload
cameraBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  socket.emit("imageMessage", data.filePath);
});

// Voice recording
let mediaRecorder;
let audioChunks = [];

micBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];

      const formData = new FormData();
      formData.append("file", blob, "voiceNote.webm");

      const res = await fetch("/upload", { method: "POST", body: formData });
      const data = await res.json();

      socket.emit("voiceMessage", data.filePath);
    };

    mediaRecorder.start();
    micBtn.innerText = "⏹";
  } else {
    mediaRecorder.stop();
    micBtn.innerText = "🎤";
  }
});
