import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    // Extract the token from the "Authorization: Bearer <TOKEN>" header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No session token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token validity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user payload metadata to the request object
    req.user = decoded;

    next(); // Pass control to the next controller layer
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token execution access.' });
  }
};