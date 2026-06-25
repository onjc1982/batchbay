import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { listingsRouter } from './routes/listings.js';
import { ebayRouter } from './routes/ebay.js';
import { templateRouter } from './routes/templates.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/ebay', ebayRouter);
app.use('/api/templates', templateRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
});