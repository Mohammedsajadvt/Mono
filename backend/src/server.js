const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Root Welcome API
app.get('/', (req, res) => {
  res.json({
    service: 'Mono Expense Tracker REST API',
    version: '1.0.0',
    status: 'online',
    database: 'TiDB Cloud (MySQL)',
    healthCheck: '/api/health',
  });
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Mono Expense Tracker REST API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  Mono REST API Server running on port ${PORT}`);
  console.log(`  Local: http://localhost:${PORT}/api/health`);
  console.log(`  Android Emulator: http://10.0.2.2:${PORT}/api/health`);
  console.log(`===============================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Mono Server Error] Port ${PORT} is already in use by another Node process.`);
    console.error(`A server instance is already running and serving requests on port ${PORT}.`);
    console.error(`If you want to kill the existing process and restart fresh:`);
    console.error(`  PowerShell: Get-Process -Name node | Stop-Process -Force\n`);
  } else {
    console.error('[ServerError]', err);
  }
  process.exit(1);
});

module.exports = app;
