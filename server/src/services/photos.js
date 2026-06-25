/**
 * Photo downloader service.
 * Downloads images from provided URLs, validates them,
 * and prepares them for eBay listing attachment.
 */

import { writeFile, mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PHOTO_DIR = '/tmp/batchbay-photos/';

/**
 * Download a single photo from URL
 * @param {string} url - The photo URL
 * @param {string} sku - SKU for filename prefix
 * @param {number} index - Photo index for numbering
 * @returns {Promise<{success: boolean, path?: string, url?: string, error?: string}>}
 */
async function downloadPhoto(url, sku, index) {
  // Ensure directory exists
  await mkdir(PHOTO_DIR, { recursive: true });

  // Validate URL
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Invalid URL', url };
  }

  // Only accept http/https URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { success: false, error: 'URL must start with http:// or https://', url };
  }

  const ext = guessExtension(url);
  const filename = `${sku || 'listing'}-photo-${index + 1}${ext}`;
  const filepath = join(PHOTO_DIR, filename);

  try {
    const response = await fetch(url, {
      // Timeout after 15 seconds
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}`, url };
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return { success: false, error: `Not an image (content-type: ${contentType})`, url };
    }

    // Check file size (max 10MB)
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
      return { success: false, error: 'Image too large (max 10MB)', url };
    }

    // Download and save
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(filepath, buffer);

    return {
      success: true,
      path: filepath,
      url,
      size: buffer.length,
      contentType,
      filename,
    };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return { success: false, error: 'Download timed out (15s)', url };
    }
    return { success: false, error: err.message, url };
  }
}

/**
 * Download multiple photos for a listing
 * @param {string[]} urls - Array of photo URLs
 * @param {string} sku - SKU for filename prefix
 * @param {number} minPhotos - Minimum required photos (default: 2)
 * @returns {Promise<{photos: Array, warnings: string[], allSuccess: boolean}>}
 */
export async function downloadListingPhotos(urls, sku, minPhotos = 2) {
  if (!urls || urls.length === 0) {
    return {
      photos: [],
      warnings: ['No photo URLs provided'],
      allSuccess: false,
    };
  }

  const results = await Promise.all(
    urls.map((url, index) => downloadPhoto(url, sku, index))
  );

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const warnings = [];

  if (successful.length < minPhotos) {
    warnings.push(`Only ${successful.length} of ${minPhotos} required photos downloaded successfully`);
  }

  failed.forEach(f => {
    warnings.push(`Failed to download ${f.url}: ${f.error}`);
  });

  return {
    photos: successful,
    warnings,
    allSuccess: failed.length === 0,
  };
}

/**
 * Download photos for all listings in a batch
 * @param {Array<{photoUrls: string[], sku: string}>} listings
 * @returns {Promise<Array>}
 */
export async function downloadBatchPhotos(listings) {
  const results = await Promise.all(
    listings.map(async (listing, index) => {
      const photoResult = await downloadListingPhotos(
        listing.photoUrls || [],
        listing.sku || `listing-${index}`
      );
      return {
        index,
        sku: listing.sku,
        title: listing.title,
        photos: photoResult.photos,
        warnings: photoResult.warnings,
        allSuccess: photoResult.allSuccess,
      };
    })
  );
  return results;
}

/**
 * Clean up downloaded photos
 */
export async function cleanupPhotos(filePaths) {
  if (!filePaths || filePaths.length === 0) return;
  const results = await Promise.allSettled(
    filePaths.map(fp => unlink(fp).catch(() => {}))
  );
}

/**
 * Guess file extension from URL or content-type
 */
function guessExtension(url) {
  // Try to extract from URL path
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpe?g|png|gif|webp|bmp|tiff?|svg)$/i);
    if (match) {
      const ext = match[1].toLowerCase();
      if (ext === 'jpeg') return '.jpg';
      return '.' + ext;
    }
  } catch (e) {}
  return '.jpg'; // default
}

/**
 * Read a photo file as a base64 data URI
 */
export async function photoToDataUri(filePath) {
  const { readFile } = await import('fs/promises');
  const buffer = await readFile(filePath);
  const ext = filePath.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
  };
  const mime = mimeTypes[ext] || 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Get eBay-friendly image URLs from downloaded photos.
 * In production, these would be uploaded to eBay Picture Service (EPS).
 * For MVP, we return the data URIs.
 */
export async function getImageUrlsForEbay(photoResults) {
  const urls = [];
  for (const photo of photoResults) {
    if (photo.success && photo.path) {
      try {
        const dataUri = await photoToDataUri(photo.path);
        urls.push(dataUri);
      } catch (e) {
        urls.push(photo.url); // fallback to original URL
      }
    } else if (photo.url) {
      urls.push(photo.url);
    }
  }
  return urls;
}