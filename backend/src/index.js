const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const dotenv   = require('dotenv');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const authRoutes     = require('./routes/auth');
const groupRoutes    = require('./routes/groups');
const userRoutes     = require('./routes/users');

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) =>
  res.json({ success: true, status: 'PayCircle API is running', version: '1.0.0' })
);

// Routes
app.use('/api/auth',   authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users',  userRoutes);

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
