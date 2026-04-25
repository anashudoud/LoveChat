const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.static("public"));

// إعداد رفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
if (!fs.existsSync("public/uploads")) fs.mkdirSync("public/uploads", { recursive: true });

app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ url: "/uploads/" + req.file.filename });
});

// حفظ الرسائل
let messages = [];

io.on("connection", (socket) => {
  console.log("💬 مستخدم متصل:", socket.id);
  io.emit("user-connected", socket.id);
  socket.emit("chat history", messages);

  socket.on("chat message", (data) => {
    const msg = { ...data, timestamp: new Date().toISOString() };
    messages.push(msg);
    if (messages.length > 150) messages.shift();
    io.emit("chat message", msg);
  });

  socket.on("typing", (user) => socket.broadcast.emit("typing", user));

  // === WebRTC Signaling ===
  socket.on("call-request", (data) => socket.to(data.targetId).emit("incoming-call", { from: socket.id, type: data.type }));
  socket.on("call-accept", (data) => socket.to(data.targetId).emit("call-accepted"));
  socket.on("call-reject", (data) => socket.to(data.targetId).emit("call-rejected"));
  socket.on("call-end", (data) => socket.to(data.targetId).emit("call-ended"));

  socket.on("webrtc-offer", (data) => socket.to(data.targetId).emit("webrtc-offer", data.sdp));
  socket.on("webrtc-answer", (data) => socket.to(data.targetId).emit("webrtc-answer", data.sdp));
  socket.on("webrtc-ice", (data) => socket.to(data.targetId).emit("webrtc-ice", data.candidate));
  // === End WebRTC ===

  socket.on("disconnect", () => {
    console.log("❌ مستخدم فصل:", socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`💻 السيرفر يعمل على المنفذ ${PORT}`));