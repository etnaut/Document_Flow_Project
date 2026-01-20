import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import documentsRoutes from './routes/documents.js';
import departmentsRoutes from './routes/departments.js';
import divisionsRoutes from './routes/divisions.js';
import forwardRoutes from './routes/forward.js';
import statsRoutes from './routes/stats.js';
import pool, { testConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Flexible CORS config: accept a comma-separated list in CORS_ORIGIN, allow all when not set
const rawCors = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawCors.split(',').map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow non-browser requests (curl, server-side) which have no origin
    if (!origin) return callback(null, true);
    // If no origins configured, allow all (convenient for local dev)
    if (allowedOrigins.length === 0) return callback(null, true);
    // Allow when origin matches one of the configured origins or when wildcard is provided
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Allow larger payloads for file uploads (base64-encoded)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (for debugging)
app.use((req: Request, res: Response, next: any) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Document Request API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        login: '/api/login',
        users: '/api/users',
        documents: '/api/documents',
        departments: '/api/departments',
        divisions: '/api/divisions',
        forward: '/api/forward',
        stats: '/api/stats',
      },
    },
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// API root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Document Request API',
    version: '1.0.0',
    endpoints: {
      login: {
        method: 'POST',
        path: '/api/login',
        description: 'User authentication',
      },
      users: {
        method: 'GET, POST',
        path: '/api/users',
        description: 'Get all users or create a new user',
      },
      documents: {
        method: 'GET, POST, PUT',
        path: '/api/documents',
        description: 'Document management',
      },
      departments: {
        method: 'GET',
        path: '/api/departments',
        description: 'Get all departments',
      },
      divisions: {
        method: 'GET',
        path: '/api/divisions',
        description: 'Get all divisions',
      },
      forward: {
        method: 'POST',
        path: '/api/forward',
        description: 'Forward a document',
      },
      stats: {
        method: 'GET',
        path: '/api/stats',
        description: 'Get dashboard statistics',
      },
    },
  });
});

// API Routes
app.use('/api/login', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/divisions', divisionsRoutes);
app.use('/api/forward', forwardRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`✅ CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:8080'}`);

  // Test DB connection and provide guidance if it fails
  try {
    const ok = await testConnection();
    if (!ok) {
      console.error('\n❌ Database connection check failed. The API may return errors if the database is not available.');
      console.error('  • Verify your database settings in server/.env (see server/env.example.txt)');
      console.error('  • Ensure the Postgres server is running and credentials (DB_USER/DB_PASSWORD) are correct');
      console.error('  • Example: DB_HOST=localhost DB_PORT=5432 DB_NAME=document_flow_db DB_USER=postgres DB_PASSWORD=your_password');
    } else {
      console.log('✅ Database connectivity verified');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error while testing DB connection:', msg);
  }
});

