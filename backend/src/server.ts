/**
 * server.ts
 * 
 * Purpose: Main Express server for MeetingMind backend API.
 * 
 * Architecture decisions:
 * - Express for HTTP server (widely supported, easy deployment)
 * - TypeScript for type safety and better developer experience
 * - CORS enabled for frontend access (configured origins only)
 * - Session-based auth (cookies, not JWT) for Zoho OAuth
 * - Environment-based configuration (12-factor app principles)
 * - Graceful error handling with meaningful messages
 * 
 * Deployment:
 * - Works on Heroku, Render, Railway, AWS, etc.
 * - Just needs Node.js runtime
 * - Set environment variables via platform UI
 * - Build step: npm run build
 * - Start: npm start (or npm run dev for local)
 * 
 * Security:
 * - CORS restricted to allowed origins
 * - Session cookies are HTTP-only and secure (in production)
 * - Input validation on all endpoints
 * - Rate limiting recommended for production (TODO)
 * - API keys never exposed to clients
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import extractRoutes from './routes/extract.js';
import createTasksRoutes from './routes/createTasks.js';
import authRoutes from './routes/auth.js';
import cliqRoutes from './routes/cliq.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// ============================================================================
// Middleware
// ============================================================================

/**
 * CORS configuration
 * Only allow requests from configured frontend origins
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies for session-based auth
  })
);

/**
 * Body parsing
 */
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (with size limit)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

/**
 * Cookie parsing for session management
 */
app.use(cookieParser());

/**
 * Session management for OAuth tokens
 * 
 * NOTE: In production, use a proper session store (Redis, PostgreSQL, etc.)
 * The default in-memory store is not suitable for production (doesn't scale)
 */
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax', // CSRF protection
    },
    // TODO: Add session store for production
    // store: new RedisStore({ client: redisClient })
  })
);

/**
 * Request logging (simple version, use Morgan or Winston in production)
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
});

// ============================================================================
// Routes
// ============================================================================

/**
 * Health check endpoint
 * Useful for deployment platforms and monitoring
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'MeetingMind API',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: NODE_ENV,
    mockMode: process.env.USE_MOCK === 'true',
  });
});

/**
 * API routes
 */
app.use('/api/extract', extractRoutes);
app.use('/api/create-tasks', createTasksRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cliq', cliqRoutes);

/**
 * 404 handler for unknown routes
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'POST /api/extract',
      'POST /api/create-tasks',
      'GET /api/auth/zoho',
      'GET /api/auth/zoho/callback',
      'GET /api/auth/status',
      'POST /api/auth/logout',
      'POST /api/cliq/webhook',
      'GET /health',
    ],
  });
});

/**
 * Global error handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
    // Don't expose stack traces in production
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// Server Start
// ============================================================================

/**
 * Start the Express server
 */
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 MeetingMind Backend API');
  console.log('='.repeat(60));
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Mock Mode: ${process.env.USE_MOCK === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/extract           - Extract tasks from notes');
  console.log('  POST   /api/create-tasks      - Create tasks in Zoho Projects');
  console.log('  GET    /api/auth/zoho         - Initiate OAuth flow');
  console.log('  GET    /api/auth/status       - Check auth status');
  console.log('  POST   /api/cliq/webhook      - Cliq slash command');
  console.log('  GET    /health                - Health check');
  console.log('');
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('');
});

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
