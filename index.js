require("dotenv").config(); // Load local .env variables
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

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
  "https://nayaaxisfoods.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman / curl
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
app.use("/", subscribeRoute);
app.use("/", blogRoute);
app.use("/", productRouter);
app.use("/", staffRouter);
app.use("/", reviewRouter);

/* =======================
   Export App for Vercel
======================= */
module.exports = app;

/* =======================
   Local server (development only)
======================= */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running locally at http://localhost:${PORT}`);
  });
}
