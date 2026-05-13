const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

// Routes (Stubs that will be created later)
// const authRoutes = require('./routes/auth.routes');
// const customerRoutes = require('./routes/customer.routes');
// const billingRoutes = require('./routes/billing.routes');
// const packageRoutes = require('./routes/package.routes');
// const mikrotikRoutes = require('./routes/mikrotik.routes');
// const employeeRoutes = require('./routes/employee.routes');
// const ticketRoutes = require('./routes/ticket.routes');
// const reportRoutes = require('./routes/report.routes');
// const resellerRoutes = require('./routes/reseller.routes');
// const notificationRoutes = require('./routes/notification.routes');
// const paymentRoutes = require('./routes/payment.routes');
// const settingsRoutes = require('./routes/settings.routes');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Expose io instance to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// API Routes
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/billing', billingRoutes);
// app.use('/api/v1/packages', packageRoutes);
// app.use('/api/v1/mikrotik', mikrotikRoutes);
// app.use('/api/v1/employees', employeeRoutes);
// app.use('/api/v1/tickets', ticketRoutes);
// app.use('/api/v1/reports', reportRoutes);
// app.use('/api/v1/resellers', resellerRoutes);
// app.use('/api/v1/notifications', notificationRoutes);
// app.use('/api/v1/payments/gateway', paymentRoutes);
// app.use('/api/v1/settings', settingsRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, server };
