import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadRouter } from './routes/upload.js';
import { listingsRouter } from './routes/listings.js';
import { ebayRouter } from './routes/ebay.js';
import { templateRouter } from './routes/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes (must come before static file serving)
app.use('/api/upload', uploadRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/ebay', ebayRouter);
app.use('/api/templates', templateRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: serve built client static files
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA catch-all: serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

// In-memory storage for the MVP
// In production, this would be a database
export const db = {
  listings: [],
  templates: [],
  uploadHistory: [],
};

app.listen(PORT, () => {
  console.log(`BatchBay API server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Serving static files from ${clientDist}`);
  }
});