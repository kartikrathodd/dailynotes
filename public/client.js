const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const roomName = document.getElementById("room-name");
const participantsSpan = document.getElementById("participants");

let myLastMessage = null;
let typingTimeout;
const typingIndicators = {}; // track indicators by user
const lastMessageByUser = {}; // track last message element for each user

// get room number from URL
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomName.innerText = "Room: " + room;

// join room
socket.emit("joinRoom", room);

// Send message
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
    removeTypingIndicator(msg.sender); // remove typing if message arrives
    addMessage(msg, "received");
    socket.emit("seen", { room, sender: msg.sender });
  }
});

// Add message with upward smooth animation
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

  // --- Animation ---
  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateY(20px)";
  wrapper.style.transition = "all 0.3s ease";

  messages.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.style.opacity = "1";
    wrapper.style.transform = "translateY(0)";
  });
  // -----------------

  // Track last message by user
  lastMessageByUser[msg.sender] = wrapper;

  autoScroll();
  return wrapper;
}

// ✅ Auto-scroll helper (with buffer for input box)
function autoScroll() {
  messages.scrollTo({
    top: messages.scrollHeight + 80, // bigger buffer to avoid overlap
    behavior: "smooth"
  });
}

// Seen event
socket.on("seen", function() {
  if (myLastMessage) {
    const stat = myLastMessage.querySelector(".status");
    if (stat) stat.innerText = "Seen";
  }
});

// Typing logic
input.addEventListener("input", () => {
  socket.emit("typing", room);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", room);
  }, 1000);
});

// Show typing indicator just below last message of that user
socket.on("typing", (data) => {
  if (!typingIndicators[data.id]) {
    const indicator = document.createElement("div");
    indicator.classList.add("typing-indicator");
    indicator.innerText = "Typing...";

    // Insert after that user's last message, or at the end
    const lastMsg = lastMessageByUser[data.id];
    if (lastMsg && lastMsg.nextSibling) {
      messages.insertBefore(indicator, lastMsg.nextSibling);
    } else {
      messages.appendChild(indicator);
    }

    // Animate in
    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(15px)";
    indicator.style.transition = "all 0.3s ease";
    requestAnimationFrame(() => {
      indicator.style.opacity = "1";
      indicator.style.transform = "translateY(0)";
    });

    typingIndicators[data.id] = indicator;
  }
  autoScroll();
});

// Remove typing indicator
socket.on("stopTyping", (data) => {
  removeTypingIndicator(data.id);
});

function removeTypingIndicator(id) {
  if (typingIndicators[id]) {
    const indicator = typingIndicators[id];

    // Animate out before removing
    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(15px)";
    setTimeout(() => {
      if (indicator.parentNode) messages.removeChild(indicator);
    }, 300);

    delete typingIndicators[id];
  }
}

// Update participants
socket.on("participants", (count) => {
  participantsSpan.innerText = count;
});
