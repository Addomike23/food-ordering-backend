require("dotenv").config(); // Load local .env variables
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const subscribeRoute = require("./router/subscriptionRoute");
const blogRoute = require("./router/blogRoute");
const productRouter = require("./router/productRoute");
const staffRouter = require("./router/staffRoute");
const reviewRouter = require("./router/reviewRoute");
const heroMessage = require("./json/heroMessage.json");

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   Middleware
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

/* =======================
   CORS Configuration
======================= */
const allowedOrigins = [
  "https://portryfarm.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow curl/Postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* =======================
   Routes
======================= */

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Naya Axis Foods Backend is running",
    endpoints: {
      hero: "/hero",
      health: "/health",
      api: "/api"
    }
  });
});

// Hero route
app.get("/hero", (req, res) => {
  res.json({
    success: true,
    message: heroMessage
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// API routers
app.use("/api", subscribeRoute);
app.use("/api", blogRoute);
app.use("/api", productRouter);
app.use("/api", staffRouter);
app.use("/api", reviewRouter);

/* =======================
   MongoDB Connection (Mongoose 7+ safe)
======================= */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URL, {
      bufferCommands: false
      // no useNewUrlParser or useUnifiedTopology needed for Mongoose 7+
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* =======================
   Export App for Vercel
======================= */
module.exports = app;

/* =======================
   Local server for testing
======================= */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running locally at http://localhost:${PORT}`);
  });
}
