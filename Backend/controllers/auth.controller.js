import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Helper function to generate JWT Tokens
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token lasts 7 days
  });
};

// 1. REGISTER CONTROLLER
export const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Create and save new user (Password automatically hashes via pre-save hook in model)
    const newUser = await User.create({ fullName, email, password });

    // Generate token so they are immediately logged in upon registering
    const token = generateToken(newUser._id);

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName }
    });

  } catch (error) {
    console.error('❌ Register error:', error); // Make this more visible

    res.status(500).json({ message: 'Server registration error.', error: error.message });
  }
};

// 2. LOGIN CONTROLLER
export const loginUser = async (req, res) => {
  try {
    console.log("📨 Incoming login request payload body:", req.body);
    const { email, password } = req.body;

 
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }


    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Verify password using custom model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate secure login token
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: { id: user._id, email: user.email, fullName: user.fullName }
    });

  } catch (error) {
    console.error("❌ Login controller system crash:", error.message);
    res.status(500).json({ message: 'Server login error.', error: error.message });
  }
};