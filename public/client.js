// Existing socket.io connection
const socket = io();

// DOM Elements
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messagesContainer = document.getElementById("messages");
const micButton = document.getElementById("micButton");
const cameraButton = document.getElementById("cameraButton");

// Typing status
const typingStatus = document.getElementById("typingStatus");

// Handle sending text messages
sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message) {
        appendMessage(message, "right", false); // Your own msg
        socket.emit("chat message", message);
        messageInput.value = "";
    }
});

// Typing event
messageInput.addEventListener("input", () => {
    socket.emit("typing", messageInput.value.length > 0);
});

// Listen for messages
socket.on("chat message", (msg) => {
    appendMessage(msg, "left", false);
});

// Listen for typing
socket.on("typing", (isTyping) => {
    typingStatus.textContent = isTyping ? "User is typing..." : "";
});

// Add message to UI
function appendMessage(message, side, isAudio) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", side);

    if (isAudio) {
        // Create audio player
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = message;

        // Create Replay Button
        const replayBtn = document.createElement("button");
        replayBtn.textContent = "🔁 Replay";
        replayBtn.classList.add("replay-btn");
        replayBtn.onclick = () => {
            audio.currentTime = 0;
            audio.play();
        };

        msgDiv.appendChild(audio);
        msgDiv.appendChild(replayBtn);
    } else {
        msgDiv.textContent = message;
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 🎤 Voice Recording
let mediaRecorder;
let audioChunks = [];

micButton.addEventListener("click", async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Send to UI with Replay
            appendMessage(audioUrl, "right", true);

            // Send to server
            socket.emit("voice message", audioBlob);

            audioChunks = [];
        };

        mediaRecorder.start();
        micButton.textContent = "⏹ Stop";
    } else {
        mediaRecorder.stop();
        micButton.textContent = "🎤 Voice";
    }
});

// Receive voice note
socket.on("voice message", (arrayBuffer) => {
    const audioBlob = new Blob([arrayBuffer], { type: "audio/webm" });
    const audioUrl = URL.createObjectURL(audioBlob);

    appendMessage(audioUrl, "left", true);
});
