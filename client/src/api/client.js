const API_BASE = '/api';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function previewListings(rows, columnMapping, templateHtml) {
  const res = await fetch(`${API_BASE}/listings/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, columnMapping, templateHtml }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Preview failed' }));
    throw new Error(err.error || 'Preview failed');
  }
  return res.json();
}

export async function publishListings(listings, publishToEbay = false) {
  const res = await fetch(`${API_BASE}/listings/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listings, publishToEbay }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Publish failed' }));
    throw new Error(err.error || 'Publish failed');
  }
  return res.json();
}

export async function saveTemplate(name, html) {
  const res = await fetch(`${API_BASE}/templates/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, html }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Save template failed' }));
    throw new Error(err.error || 'Save template failed');
  }
  return res.json();
}

export async function getTemplates() {
  const res = await fetch(`${API_BASE}/templates`);
  return res.json();
}

export async function getEbayCategories() {
  const res = await fetch(`${API_BASE}/ebay/categories`);
  return res.json();
}

export async function getEbayStatus() {
  const res = await fetch(`${API_BASE}/ebay/status`);
  return res.json();
}

export async function getEbayAuthUrl() {
  const res = await fetch(`${API_BASE}/ebay/auth-url`);
  return res.json();
}

export async function createBatchEbayListings(listings) {
  const res = await fetch(`${API_BASE}/ebay/create-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'eBay batch create failed' }));
    throw new Error(err.error || 'eBay batch create failed');
  }
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}