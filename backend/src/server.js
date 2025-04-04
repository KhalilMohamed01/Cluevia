const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const session = require("express-session");
const { Server } = require("socket.io");
const prisma = require("./db");

require("dotenv").config();
require("./config/passport"); // For Discord Passport Strategy

const authRoutes = require("./routes/auth"); // Authentication Routes
const { router: gameRoutes } = require("./routes/game"); // Game Routes

const app = express();
const server = require("http").createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL, credentials: true } });

// Socket.IO Setup
require("./sockets")(io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/game", gameRoutes);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on ${process.env.CLIENT_URL}:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
