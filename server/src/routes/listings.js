import { Router } from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import * as ebayService from '../services/ebay.js';
import { downloadListingPhotos, cleanupPhotos } from '../services/photos.js';

export const listingsRouter = Router();

// POST /api/listings/preview - Generate listing previews from mapped data
listingsRouter.post('/preview', (req, res) => {
  try {
    const { rows, columnMapping, templateHtml } = req.body;

    if (!rows || !columnMapping) {
      return res.status(400).json({ error: 'Missing required fields: rows and columnMapping' });
    }

    const previews = rows.map((row, index) => {
      const listing = {
        id: uuidv4(),
        index,
        title: row[columnMapping.title] || 'Untitled',
        description: row[columnMapping.description] || '',
        price: parseFloat(row[columnMapping.price]) || 0,
        condition: row[columnMapping.condition] || 'Used',
        category: row[columnMapping.category] || '',
        categoryId: row[columnMapping.category] || '',
        photoUrls: columnMapping.photoUrls
          ? row[columnMapping.photoUrls]
              ?.split(/[,;\n]/)
              .map(u => u.trim())
              .filter(u => u.startsWith('http'))
          : [],
        quantity: parseInt(row[columnMapping.quantity]) || 1,
        sku: row[columnMapping.sku] || `SKU-${Date.now()}-${index}`,
      };

      // Apply HTML template if provided
      if (templateHtml) {
        listing.renderedHtml = templateHtml
          .replace(/\{\{title\}\}/g, listing.title)
          .replace(/\{\{description\}\}/g, listing.description)
          .replace(/\{\{price\}\}/g, listing.price.toString())
          .replace(/\{\{condition\}\}/g, listing.condition)
          .replace(/\{\{category\}\}/g, listing.category)
          .replace(/\{\{photos\}\}/g, listing.photoUrls.map(url =>
            `<img src="${url}" alt="${listing.title}" style="max-width:500px;" />`
          ).join('\n'));
      }

      return listing;
    });

    res.json({ success: true, previews, total: previews.length });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: `Failed to generate previews: ${err.message}` });
  }
});

// POST /api/listings/publish - Publish listings to eBay (or save as drafts)
listingsRouter.post('/publish', async (req, res) => {
  try {
    const { listings, publishToEbay } = req.body;
    if (!listings || !listings.length) {
      return res.status(400).json({ error: 'No listings provided' });
    }

    const results = [];

    for (const listing of listings) {
      try {
        let ebayResult = null;
        let downloadedPhotos = null;

        // Step 1: Download photos if URLs provided
        if (listing.photoUrls && listing.photoUrls.length > 0) {
          const photoResult = await downloadListingPhotos(
            listing.photoUrls,
            listing.sku,
            2 // minimum 2 photos
          );
          downloadedPhotos = photoResult;
        }

        // Step 2: Publish to eBay if requested
        if (publishToEbay) {
          ebayResult = await ebayService.createListing({
            ...listing,
            imageUrls: downloadedPhotos?.photos.map(p => p.url) || listing.photoUrls || [],
          });
        }

        // Step 3: Save as draft
        const savedListing = {
          ...listing,
          savedAt: new Date().toISOString(),
          status: publishToEbay ? 'published' : 'draft',
          ebayListingId: ebayResult?.listingId || null,
          photoDownloadStats: downloadedPhotos ? {
            downloaded: downloadedPhotos.photos.length,
            total: listing.photoUrls?.length || 0,
            warnings: downloadedPhotos.warnings,
          } : null,
        };
        db.listings.push(savedListing);

        results.push({
          index: listing.index,
          title: listing.title,
          success: true,
          status: savedListing.status,
          listingId: savedListing.id,
          ebayListingId: ebayResult?.listingId || null,
          photos: downloadedPhotos?.photos.length || 0,
          photoWarnings: downloadedPhotos?.warnings || [],
          message: publishToEbay
            ? 'Published to eBay'
            : 'Saved as draft (enable eBay publishing for live listings)',
        });
      } catch (err) {
        results.push({
          index: listing.index,
          title: listing.title,
          success: false,
          status: 'failed',
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      total: results.length,
      published: successCount,
      failed: results.length - successCount,
      results,
      message: `${successCount} of ${results.length} listing(s) processed successfully`,
    });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: `Failed to publish listings: ${err.message}` });
  }
});

// GET /api/listings - Get all saved listings
listingsRouter.get('/', (req, res) => {
  res.json({ success: true, listings: db.listings, total: db.listings.length });
});

// GET /api/listings/:id - Get a single listing
listingsRouter.get('/:id', (req, res) => {
  const listing = db.listings.find(l => l.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json({ success: true, listing });
});

// DELETE /api/listings - Clear all listings
listingsRouter.delete('/', (req, res) => {
  const count = db.listings.length;
  db.listings = [];
  res.json({ success: true, message: `Cleared ${count} listing(s)` });
});