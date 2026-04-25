const socket = io();
let user;

function joinChat() {
  user = document.getElementById("username").value;
  if (!user) return;
  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";
}

function send() {
  const input = document.getElementById("msg");
  const imageInput = document.getElementById("image");

  if (imageInput.files.length > 0) {
    const formData = new FormData();
    formData.append("image", imageInput.files[0]);

    fetch("/upload", { method: "POST", body: formData })
      .then(res => res.json())
      .then(data => {
        const msgData = { user, text: "", image: data.url };
        addMsg(msgData, true);
        socket.emit("chat message", msgData);
      });

    imageInput.value = "";
  }

  if (input.value) {
    const msgData = { user, text: input.value };
    addMsg(msgData, true);
    socket.emit("chat message", msgData);
    input.value = "";
  }
}

function addMsg(data, isMe) {
  const div = document.createElement("div");
  div.className = "msg " + (isMe ? "me" : "other");
  div.innerHTML = data.text + (data.image ? `<br><img src="${data.image}">` : "");
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

function addEmoji(emoji) {
  document.getElementById("msg").value += emoji;
}

function typing() {
  socket.emit("typing", user);
}

socket.on("chat message", (data) => {
  if (data.user !== user) addMsg(data, false);
});

socket.on("typing", (name) => {
  if (name === user) return;
  const t = document.getElementById("typing");
  t.textContent = `${name} يكتب الآن...`;
  setTimeout(() => t.textContent = "", 1000);
});

socket.on("chat history", (msgs) => {
  msgs.forEach(msg => addMsg(msg, msg.user === user));
});
