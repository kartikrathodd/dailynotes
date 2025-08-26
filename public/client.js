// -------------------- SOCKET.IO CONNECTION --------------------
const socket = io("/", {
  transports: ["websocket"],
  upgrade: false,
  timeout: 20000,            // 20 seconds timeout for initial connection
  reconnection: true,        // enable auto-reconnect
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,   // retry every 2 seconds
  reconnectionDelayMax: 10000
});

// Optional: show connecting status on UI
const loadingIndicator = document.getElementById("loading-indicator"); // create a div in HTML
function showLoading(msg) {
  if (loadingIndicator) loadingIndicator.innerText = msg;
  if (loadingIndicator) loadingIndicator.style.display = "block";
}
function hideLoading() {
  if (loadingIndicator) loadingIndicator.style.display = "none";
}

showLoading("Connecting to server...");

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
  hideLoading();
});

socket.on("connect_error", (err) => {
  console.log("❌ Connection error:", err.message);
  showLoading("Server is waking up..."); // Render server asleep
});

socket.on("reconnect_attempt", (attempt) => {
  console.log("🔄 Reconnecting attempt:", attempt);
  showLoading("Reconnecting...");
});

socket.on("reconnect", (attempt) => {
  console.log("✅ Reconnected after attempt:", attempt);
  hideLoading();
});

socket.on("reconnect_failed", () => {
  console.log("❌ Failed to reconnect. Please refresh.");
  showLoading("Unable to connect. Please refresh.");
});

// -------------------- REST OF YOUR EXISTING CODE --------------------
// (Keep all the existing code: join room, send messages, typing, photos, voice, etc.)

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");
const clearBtn = document.getElementById("clear-chat-btn");
const photoInput = document.getElementById("photo-input");
const voiceBtn = document.getElementById("voice-btn");

let myLastMessage = null;
let typingTimeout;
const typingIndicators = {};
const lastMessageByUser = {};

const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomName.innerText = "Room: " + room;

// join room
socket.emit("joinRoom", room);

// -------------------- SEND TEXT MESSAGE --------------------
form.addEventListener("submit", function(e) {
  e.preventDefault();
  if (input.value) {
    const msg = { text: input.value, sender: socket.id, room: room };
    socket.emit("chat message", msg);
    myLastMessage = addMessage(msg, "sent");
    input.value = "";
  }
});

// ... (keep all other functions: addMessage, autoScroll, typing, seen, photo, voice, receive-photo, receive-voice)
