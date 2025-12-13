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
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Naya Axis Foods Backend is running",
    endpoints: {
      hero: "/hero",
      api: "/api"
    }
  });
});
/* =======================
   Routes
======================= */
app.get("/hero", (req, res) => {
  res.json({
    success: true,
    message: heroMessage
  });
});

app.use("/api", subscribeRoute);
app.use("/api", blogRoute);
app.use("/api", productRouter);
app.use("/api", staffRouter);
app.use("/api", reviewRouter);

/* =======================
   MongoDB Connection (Cached)
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
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

connectDB().then(() => {
  console.log("MongoDB connected");
});

/* =======================
   Export App (REQUIRED)
======================= */
module.exports = app;
