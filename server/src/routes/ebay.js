import { Router } from 'express';
import * as ebayService from '../services/ebay.js';

export const ebayRouter = Router();

// GET /api/ebay/status - Full eBay connection status
ebayRouter.get('/status', async (req, res) => {
  try {
    const status = await ebayService.checkConnection();
    res.json({ success: true, ...status });
  } catch (err) {
    res.json({
      success: true,
      configured: !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
      message: 'eBay API status check failed',
      error: err.message,
    });
  }
});

// GET /api/ebay/auth-url - Get eBay OAuth authorization URL
ebayRouter.get('/auth-url', (req, res) => {
  const authUrl = ebayService.getAuthUrl();
  if (!authUrl) {
    return res.status(400).json({
      success: false,
      error: 'eBay API not configured. Set EBAY_CLIENT_ID in .env',
    });
  }
  res.json({ success: true, authUrl });
});

// GET /api/ebay/callback - Handle OAuth callback
ebayRouter.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const result = await ebayService.exchangeAuthCode(code);
    res.json({
      success: true,
      message: 'eBay authorization successful! You can now create listings.',
      tokenInfo: {
        expiresIn: result.expires_in,
        hasRefreshToken: !!result.refresh_token,
      },
    });
  } catch (err) {
    res.status(500).json({ error: `eBay auth failed: ${err.message}` });
  }
});

// GET /api/ebay/categories - Get eBay categories
ebayRouter.get('/categories', async (req, res) => {
  try {
    const categories = await ebayService.getCategories();
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch categories: ${err.message}` });
  }
});

// POST /api/ebay/create-listing - Create a single eBay listing
ebayRouter.post('/create-listing', async (req, res) => {
  try {
    const listing = req.body;
    if (!listing.title || !listing.price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }
    const result = await ebayService.createListing(listing);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: `Failed to create listing: ${err.message}` });
  }
});

// POST /api/ebay/create-batch - Create multiple eBay listings
ebayRouter.post('/create-batch', async (req, res) => {
  try {
    const { listings } = req.body;
    if (!listings || !listings.length) {
      return res.status(400).json({ error: 'No listings provided' });
    }
    const results = await ebayService.createBatchListings(listings);
    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      total: results.length,
      published: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: `Batch create failed: ${err.message}` });
  }
});

// GET /api/ebay/token-status - Check token status
ebayRouter.get('/token-status', (req, res) => {
  res.json({ success: true, ...ebayService.getTokenStatus() });
});