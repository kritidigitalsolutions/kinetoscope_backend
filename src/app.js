const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/error.middleware');
const rootRouter = require('./routes');
const app = express();

// Set security HTTP headers
app.use(helmet());


// Enable CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://kinetoscope-superadmin-seven.vercel.app',
  'https://kinetoscope-clientadmin.vercel.app',
  'https://kinetoscope-agentadmin.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching allowedOrigins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development' || origin.includes('postman') || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'KFPL API Server is healthy and running.'
  });
});


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Kinetoscope API!'
  });
});

// API Routes
app.use('/api', rootRouter);

// Fallback for unhandled routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

module.exports = app;
