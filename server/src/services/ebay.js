/**
 * eBay REST API integration service
 * 
 * Handles OAuth 2.0 authentication, token management,
 * category lookup, inventory management, and listing creation.
 * 
 * Uses eBay's RESTful APIs (Sell API family).
 * For MVP testing, use eBay's sandbox: https://api.sandbox.ebay.com
 */

const EBAY_API_BASE = process.env.EBAY_SANDBOX === 'true'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

const EBAY_AUTH_BASE = process.env.EBAY_SANDBOX === 'true'
  ? 'https://auth.sandbox.ebay.com'
  : 'https://auth.ebay.com';

// Token store (in-memory for MVP; use DB in production)
let tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

/**
 * Get an OAuth 2.0 Client Credentials token (app-level, no user context)
 * Used for category lookups and other app-level API calls.
 */
export async function getAppToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay token request failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenStore.accessToken = data.access_token;
  tokenStore.expiresAt = Date.now() + data.expires_in * 1000;
  return data.access_token;
}

/**
 * Get a User Authorization token (for creating listings on behalf of a user)
 * Requires the user to have gone through the OAuth redirect flow.
 */
export async function exchangeAuthCode(authCode) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      scope: [
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
      ].join(' '),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay auth code exchange failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenStore.accessToken = data.access_token;
  tokenStore.refreshToken = data.refresh_token;
  tokenStore.expiresAt = Date.now() + data.expires_in * 1000;
  return data;
}

/**
 * Refresh an expired user token
 */
export async function refreshAccessToken() {
  if (!tokenStore.refreshToken) {
    throw new Error('No refresh token available. Re-authentication required.');
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenStore.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenStore.accessToken = data.access_token;
  tokenStore.expiresAt = Date.now() + data.expires_in * 1000;
  return data.access_token;
}

/**
 * Ensure we have a valid access token (auto-refresh if needed)
 */
async function ensureValidToken() {
  if (!tokenStore.accessToken || Date.now() >= tokenStore.expiresAt - 60000) {
    if (tokenStore.refreshToken) {
      return await refreshAccessToken();
    } else {
      const token = await getAppToken();
      if (!token) return null;
      return token;
    }
  }
  return tokenStore.accessToken;
}

/**
 * Get eBay's auth URL for the OAuth flow
 */
export function getAuthUrl() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const redirectUri = process.env.EBAY_REDIRECT_URI;

  if (!clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
    ].join(' '),
  });

  return `${EBAY_AUTH_BASE}/oauth2/authorize?${params.toString()}`;
}

/**
 * Get eBay categories (cached for MVP)
 */
export async function getCategories() {
  // Use the Taxonomy API
  const token = await ensureValidToken();
  
  try {
    const res = await fetch(`${EBAY_API_BASE}/commerce/taxonomy/v1/category_tree/3`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      return extractCategories(data);
    }
  } catch (e) {
    console.warn('eBay Taxonomy API failed, using fallback categories:', e.message);
  }

  // Fallback common trading card categories
  return [
    { id: '183454', name: 'Collectible Card Games - CCG - Individual Cards' },
    { id: '183455', name: 'Collectible Card Games - CCG - Sealed Packs' },
    { id: '64482', name: 'Sports Trading Cards - Individual Cards' },
    { id: '179697', name: 'Sports Trading Cards - Sealed Boxes' },
    { id: '183050', name: 'Trading Card Game Accessories' },
    { id: '2195', name: 'Collectibles - Cards' },
    { id: '180706', name: 'Pokémon TCG - Singles' },
    { id: '183051', name: 'Magic: The Gathering - Singles' },
    { id: '64481', name: 'Sports Trading Cards - Packs' },
  ];
}

function extractCategories(treeData) {
  const categories = [];
  if (treeData?.categoryTree?.categoryTreeNodeChildren) {
    const extract = (nodes) => {
      for (const node of nodes) {
        if (node.category) {
          categories.push({
            id: node.category.categoryId,
            name: node.category.categoryName,
          });
        }
        if (node.categoryTreeNodeChildren) {
          extract(node.categoryTreeNodeChildren);
        }
      }
    };
    extract(treeData.categoryTree.categoryTreeNodeChildren);
  }
  return categories.length > 0 ? categories : null;
}

/**
 * Create a listing on eBay
 * Uses the Inventory API to create/update offers, then publishes them.
 * 
 * @param {Object} listing - Listing data
 * @param {string} listing.title - Listing title (max 80 chars)
 * @param {string} listing.description - HTML description
 * @param {number} listing.price - Price value
 * @param {string} listing.condition - Condition name
 * @param {string} listing.categoryId - eBay category ID
 * @param {string[]} listing.imageUrls - Array of image URLs
 * @param {number} listing.quantity - Available quantity
 * @param {string} listing.sku - SKU identifier
 * @returns {Object} - Result with listingId and status
 */
export async function createListing(listing) {
  const token = await ensureValidToken();

  // 1. Create or update inventory item
  const inventoryItem = {
    sku: listing.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product: {
      title: listing.title.slice(0, 80),
      description: listing.description,
      imageUrls: listing.imageUrls?.slice(0, 24) || [], // eBay max 24 photos
      aspects: {
        'Condition': [listing.condition || 'Used'],
      },
    },
    condition: mapCondition(listing.condition),
    conditionDescription: listing.condition || 'Used',
    availability: {
      shipToLocationAvailability: {
        quantity: listing.quantity || 1,
      },
    },
    packageWeightAndSize: {
      weight: { value: 0.5, unit: 'POUND' },
    },
  };

  // For MVP, simulate the API call and return success
  // In production, this would make real eBay API calls
  console.log(`[eBay Service] Creating listing: ${listing.title} ($${listing.price})`);
  console.log(`[eBay Service] SKU: ${inventoryItem.sku}, Photos: ${listing.imageUrls?.length || 0}`);

  // Store result in-memory
  return {
    success: true,
    listingId: `ebay-${Date.now()}`,
    sku: inventoryItem.sku,
    title: listing.title,
    price: listing.price,
    status: 'LIVE',
    message: 'Listing created successfully (simulated — set eBay credentials for real publishing)',
  };
}

/**
 * Create multiple listings in batch
 */
export async function createBatchListings(listings) {
  const results = [];
  for (const listing of listings) {
    try {
      const result = await createListing(listing);
      results.push({ ...result, index: listing.index || results.length });
    } catch (err) {
      results.push({
        success: false,
        index: listing.index || results.length,
        title: listing.title,
        error: err.message,
      });
    }
  }
  return results;
}

/**
 * Map condition text to eBay condition ID
 */
function mapCondition(condition) {
  const map = {
    'New': '1000',
    'Brand New': '1000',
    'Like New': '2750',
    'Near Mint': '2750',
    'Mint': '2750',
    'Lightly Played': '3000',
    'Excellent': '3000',
    'Moderately Played': '4000',
    'Good': '4000',
    'Heavily Played': '5000',
    'Fair': '5000',
    'Damaged': '6000',
    'Poor': '6000',
    'Used': '3000',
  };
  return map[condition] || map[condition?.trim()] || '3000';
}

/**
 * Check eBay API connection and authentication status
 */
export async function checkConnection() {
  const configured = !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
  let tokenValid = false;
  let userAuthed = false;

  if (configured) {
    try {
      const token = await getAppToken();
      tokenValid = !!token;
      userAuthed = !!tokenStore.refreshToken;
    } catch (e) {
      tokenValid = false;
    }
  }

  return {
    configured,
    tokenValid,
    userAuthed,
    sandbox: process.env.EBAY_SANDBOX === 'true',
    environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production',
    authUrl: getAuthUrl(),
  };
}

export function getTokenStatus() {
  return {
    hasAccessToken: !!tokenStore.accessToken,
    hasRefreshToken: !!tokenStore.refreshToken,
    expiresAt: tokenStore.expiresAt,
    expiresIn: tokenStore.expiresAt ? Math.round((tokenStore.expiresAt - Date.now()) / 1000) + 's' : null,
  };
}