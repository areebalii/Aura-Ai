import express from "express"
import mongoose from "mongoose"
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT;
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('Aura AI Backend Server is running smoothly!');
});
// Temporary test route in server.js
app.get('/test-user', async (req, res) => {
  const user = await User.findOne({ email: 'areeb@test.com' });
  res.json({ found: !!user, user });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🍃 Connected to MongoDB Successfully!');
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('❌ DB error:', err));
