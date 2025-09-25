const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const { startCreditDeductionJob, startFreeSessionTimerJob } = require('./jobs/creditDeductionJob');

// Load environment variables
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
});

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Connect to MongoDB
connectDB();

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Visitor tracking middleware
app.use(async (req, res, next) => {
  const parser = new UAParser();
  const ua = req.headers['user-agent'];
  const result = parser.setUA(ua).getResult();

  // Get or set session ID
  let sessionId = req.cookies.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  } else {
  }

  // Skip logging for static or non-relevant routes
  if (req.path.startsWith('/images') || req.path === '/favicon.ico') {
    return next();
  }

  try {
    const Visitor = require('./models/Visitor');
    // Check for existing visitor record in the last 24 hours
    const recentVisit = await Visitor.findOne({
      sessionId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (!recentVisit) {
      const visitorData = {
        sessionId,
        browser: result.browser.name || 'Unknown',
        browserVersion: result.browser.version || 'Unknown',
        os: result.os.name || 'Unknown',
        osVersion: result.os.version || 'Unknown',
        device: result.device.type || 'desktop',
        ip: req.ip,
        path: req.path,
        timestamp: new Date(),
      };
      await Visitor.create(visitorData);
    } else {
    }
  } catch (err) {
    console.error('Error in visitor tracking middleware:', err);
  }

  next();
});

// Attach io to req for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// WebSocket connection
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });
  socket.on('disconnect', () => {
  });
});

// Start jobs
startCreditDeductionJob(io);
startFreeSessionTimerJob(io);

// Import and use routes
const userRoutes = require('./routes/userRoutes');
const aiPsychicRoutes = require('./routes/aiPsychicRoutes');
const chatRoutes = require('./routes/chatRoutes');
const formRoutes = require('./routes/formRoutes');
const adminRoutes = require('./routes/adminRoutes');
const geocodeRoute = require('./routes/geocode');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const timerRoutes = require('./routes/timerRoutes');
const feedback = require('./routes/feedbackRoutes');
const numerologyRouter = require('./routes/numerologyRoutes');
const astrologyRoutes = require('./routes/astrologyRoutes');
const montlyforcast = require('./routes/monthly-forcast');
const lovecompatability = require('./routes/love-compatability');
const translateRoute = require('./routes/translateRoutes');
const messageRoutes = require('./routes/messageRoutes');
const statsRoutes = require('./routes/statsRoutes');
const userReportRoutes = require('./routes/userReportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/users', userRoutes);
app.use('/api/psychics', aiPsychicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/form', formRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocode', geocodeRoute);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', timerRoutes);
app.use('/api/users', userReportRoutes);
app.use('/api', feedback);
app.use('/api', numerologyRouter);
app.use('/api', astrologyRoutes);
app.use('/api', montlyforcast);
app.use('/api', lovecompatability);
app.use('/api/translate', translateRoute);
app.use('/api/analytics', analyticsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});