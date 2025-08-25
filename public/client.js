body {
  font-family: sans-serif;
  display: flex;
  background: #f2f2f7;
  margin: 0;
  height: 100vh;
}

#chat-container {
  flex: 3;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ddd;
}

#participants-container {
  flex: 1;
  background: #fff;
  padding: 10px;
  overflow-y: auto;
}

#participants-container h3 {
  margin-top: 0;
}

#messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.bubble {
  background: #007aff;
  color: white;
  padding: 10px;
  border-radius: 18px;
  margin: 8px 0;
  max-width: 60%;
  word-wrap: break-word;
  position: relative;
}

.bubble .meta {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.bubble:nth-child(even) {
  background: #e5e5ea;
  color: black;
  margin-left: auto;
}
