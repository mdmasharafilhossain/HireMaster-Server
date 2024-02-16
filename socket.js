// ------------notification using socket io---------------------

const { Server } = require("socket.io");

const port = process.env.PORT || 5001;
const io = new Server({
  cors: {
    origin: "http://localhost:5173",
  },
});

let onlineUsers = [];

const addNewUser = (userEmail, socketId) => {
  !onlineUsers.some((user) => user.userEmail === userEmail) &&
    onlineUsers.push({ userEmail, socketId });
};
const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const getUser = (userEmail) => {
  return onlineUsers.find((user) => user.userEmail === userEmail);
};

io.on("connection", (socket) => {
  socket.on("newUser", (userEmail) => {
    addNewUser(userEmail, socket.id);
  });

  socket.on("sendNotification", ({ senderEmail, receiverEmail, type }) => {
    const receiver = getUser(receiverEmail);
    io.to(receiver.socketId).emit("getNotification", {
      senderEmail,
      type,
    });
  });

  socket.on("sendText", ({ senderEmail, receiverEmail, text }) => {
    const receiver = getUser(receiverEmail);
    io.to(receiver.socketId).emit("getText", {
      senderEmail,
      text,
    });
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
  });
});
io.listen(port, () => {
  console.log(`HireMaster Socket Running at Port ${port}`);
});
