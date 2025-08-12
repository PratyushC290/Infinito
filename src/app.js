import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";


// Import routes
import healthcheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import caRouter from "./routes/ca.routes.js";

const app = express();
app.use(cors({
  origin: "http://localhost:5173", // React dev server
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

const originalUse = app.use.bind(app);
app.use = function (path, ...handlers) {
  if (typeof path === "string") {
    console.log("🧠 Mounting route:", path);
  } else {
    console.log("🧠 Mounting middleware (no path)");
  }
  return originalUse(path, ...handlers);
};


// Common middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Request logging middleware (optional, for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/ca", caRouter);


// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running!",
    routes: {
      healthcheck: "/api/v1/healthcheck",
      auth: "/api/v1/auth",
      googleLogin: "/api/v1/auth/google",
    },
    timestamp: new Date().toISOString(),
  });
});



export { app };