import express from "express"
import mongoose from "mongoose"
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "../routes/auth.routes.js";
import chatRoutes from "../routes/chat.routes.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT;
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://aura-ai-two-blush.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

// Basic test route
app.get('/', (req, res) => {
  res.send('Aura AI Backend Server is running smoothly!');
});

// Remove app.listen() and replace your mongoose code with this:
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  console.log('🍃 Connecting to MongoDB Serverless Pool...');
  cachedDb = await mongoose.connect(process.env.MONGO_URI);
  return cachedDb;
};

// Add this wrapper middleware above your routes to guarantee connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection wrapper error:", err);
    res.status(500).send("Database connection error");
  }
});

// Your API Routes stay right here
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Aura AI Backend Server is running smoothly!');
});

export default app;

if (!process.env.VERCEL) {
  const LOCAL_PORT = PORT || 5050;
  app.listen(LOCAL_PORT, () => {
    console.log(`🚀 Local Development Server running on http://localhost:${LOCAL_PORT}`);
    console.log(`💡 Note: Database connection will initialize on your first API request!`);
  });
}