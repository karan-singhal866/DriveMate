const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
console.log("MONGO_URI:", process.env.MONGO_URI);

const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const trackingRoutes = require("./routes/trackingRoutes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("MONGO_URI and JWT_SECRET are required.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must contain at least 32 characters.");
  process.exit(1);
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",").map(v => v.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === "production" ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false
}));

const io = new Server(server, {
  cors: { origin: origins, credentials: true }
});
app.set("io", io);

io.on("connection", socket => {

  console.log("SOCKET CONNECTED:", socket.id);

  socket.on("joinUser", userId => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined notification room.`);
    }
  });

  socket.on("joinBooking", bookingId => {
    if (bookingId) {
      socket.join(`booking:${bookingId}`);
    }
  });

  socket.on("leaveBooking", bookingId => {
    if (bookingId) {
      socket.leave(`booking:${bookingId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("SOCKET DISCONNECTED:", socket.id);
  });

});

app.get("/", (req, res) => res.json({ service: "DriveMate API", status: "running" }));
app.get("/health", (req, res) => res.json({
  status: "ok",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  environment: NODE_ENV,
  timestamp: new Date().toISOString()
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tracking", trackingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS blocked the request" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "A unique field already exists" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 2
    });
    console.log("MongoDB connected successfully.");
    server.listen(PORT, () => console.log(`DriveMate API running on port ${PORT}`));
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down.`);
  await mongoose.connection.close();
  server.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
