import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { previewListings, publishListings, getEbayStatus } from '../api/client';

export default function ReviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previews, setPreviews] = useState([]);
  const [templateHtml, setTemplateHtml] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [publishResults, setPublishResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [publishToEbay, setPublishToEbay] = useState(false);
  const [ebayConfigured, setEbayConfigured] = useState(false);
  const [editListing, setEditListing] = useState(null);

  useEffect(() => {
    const parsedDataStr = sessionStorage.getItem('batchbay_parsed_data');
    const columnMappingStr = sessionStorage.getItem('batchbay_column_mapping');
    const savedTemplate = sessionStorage.getItem('batchbay_template');

    if (!parsedDataStr || !columnMappingStr) {
      navigate('/upload');
      return;
    }

    if (savedTemplate) {
      try {
        const t = JSON.parse(savedTemplate);
        setTemplateHtml(t.html || '');
        setUseTemplate(true);
      } catch (e) {}
    }

    // Check eBay status
    getEbayStatus().then(s => setEbayConfigured(s.configured)).catch(() => {});

    generatePreviews();
  }, []);

  async function generatePreviews() {
    setLoading(true);
    setError('');
    try {
      const parsedData = JSON.parse(sessionStorage.getItem('batchbay_parsed_data'));
      const columnMapping = JSON.parse(sessionStorage.getItem('batchbay_column_mapping'));
      const template = sessionStorage.getItem('batchbay_template');
      let html = '';
      if (template) {
        try { html = JSON.parse(template).html || ''; } catch (e) {}
      }

      const result = await previewListings(parsedData.rows, columnMapping, html);
      setPreviews(result.previews);
      setSelectedIds(new Set(result.previews.map(p => p.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    if (selectedIds.size === previews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(previews.map(p => p.id)));
    }
  }

  function toggleOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function handleEdit(listing) {
    setEditListing({ ...listing });
  }

  function saveEdit() {
    if (!editListing) return;
    setPreviews(prev => prev.map(p => p.id === editListing.id ? editListing : p));
    setEditListing(null);
  }

  async function handlePublish() {
    const toPublish = previews.filter(p => selectedIds.has(p.id));
    if (toPublish.length === 0) {
      setError('No listings selected');
      return;
    }

    setPublishing(true);
    setError('');
    setSuccess('');
    setShowResults(false);
    setPublishResults(null);

    try {
      const result = await publishListings(toPublish, publishToEbay);
      setPublishResults(result);
      setShowResults(true);
      if (result.failed === 0) {
        setSuccess(`✅ ${result.published} of ${result.total} listing(s) processed successfully!`);
      } else {
        setSuccess(`⚠️ ${result.published} succeeded, ${result.failed} failed`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Generating listing previews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review & Publish</h1>
          <p className="mt-1 text-sm text-gray-500">
            {previews.length} listing(s) generated. Select the ones to publish.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            ← Back to Upload
          </button>
          <button
            onClick={() => navigate('/templates')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Edit Template
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && !showResults && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      {/* Settings bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useTemplate}
            onChange={() => setUseTemplate(!useTemplate)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Apply HTML template
        </label>

        <div className="h-4 w-px bg-gray-300" />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishToEbay}
            onChange={() => setPublishToEbay(!publishToEbay)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            disabled={!ebayConfigured}
          />
          Publish to eBay {ebayConfigured ? '🟢' : '🔴 (not configured)'}
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {selectedIds.size === previews.length
              ? 'All selected'
              : `${selectedIds.size} of ${previews.length} selected`}
          </span>
          <button
            onClick={handlePublish}
            disabled={publishing || selectedIds.size === 0}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {publishing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              `🚀 Publish ${selectedIds.size} Listing(s)`
            )}
          </button>
        </div>
      </div>

      {/* Select all bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200">
        <input
          type="checkbox"
          checked={previews.length > 0 && selectedIds.size === previews.length}
          onChange={toggleAll}
          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-600 font-medium">Select all listings</span>
        <span className="text-xs text-gray-400">({previews.length} total)</span>
      </div>

      {/* Publish results */}
      {showResults && publishResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              📊 Publish Results
            </h3>
            <button
              onClick={() => setShowResults(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
          <div className="p-4">
            <div className="flex gap-4 mb-4">
              <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                ✅ {publishResults.published} Published
              </div>
              {publishResults.failed > 0 && (
                <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  ❌ {publishResults.failed} Failed
                </div>
              )}
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {publishResults.results.map((r, i) => (
                <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                  r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <span className="font-medium">{r.title}</span>
                  {r.success
                    ? ` → ${r.status}${r.ebayListingId ? ` (eBay ID: ${r.ebayListingId})` : ''}`
                    : ` → Failed: ${r.error}`}
                  {r.photoWarnings?.length > 0 && (
                    <span className="ml-2 text-yellow-600 text-xs">⚠️ {r.photoWarnings[0]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editListing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditListing(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Listing</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={editListing.title}
                  onChange={e => setEditListing({...editListing, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                  <input type="number" step="0.01" value={editListing.price}
                    onChange={e => setEditListing({...editListing, price: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input type="number" value={editListing.quantity}
                    onChange={e => setEditListing({...editListing, quantity: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Condition</label>
                <input type="text" value={editListing.condition}
                  onChange={e => setEditListing({...editListing, condition: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditListing(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Listing cards */}
      <div className="space-y-3">
        {previews.map((listing) => (
          <div
            key={listing.id}
            className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
              selectedIds.has(listing.id) ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selectedIds.has(listing.id)}
                onChange={() => toggleOne(listing.id)}
                className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                      <span>💰 ${listing.price.toFixed(2)}</span>
                      <span>📋 {listing.condition}</span>
                      <span>📦 Qty: {listing.quantity}</span>
                      {listing.sku && <span className="text-xs text-gray-400">ID: {listing.sku}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {listing.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Cat: {listing.category}
                      </span>
                    )}
                    <button
                      onClick={() => handleEdit(listing)}
                      className="text-xs text-gray-400 hover:text-brand-600 px-2 py-1 hover:bg-brand-50 rounded"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>

                {/* Photos */}
                {listing.photoUrls && listing.photoUrls.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {listing.photoUrls.slice(0, 6).map((url, i) => (
                      <div key={i} className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'; }}
                        />
                      </div>
                    ))}
                    {listing.photoUrls.length > 6 && (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0 border border-gray-200">
                        +{listing.photoUrls.length - 6}
                      </div>
                    )}
                    <span className="text-xs text-gray-400 self-center ml-1">
                      {listing.photoUrls.length} photo(s)
                    </span>
                  </div>
                )}

                {/* Description preview */}
                {listing.description && (
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{listing.description}</p>
                )}

                {/* Rendered HTML preview */}
                {useTemplate && listing.renderedHtml && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-24 overflow-hidden">
                    <div className="prose prose-xs max-w-none text-xs" dangerouslySetInnerHTML={{ __html: listing.renderedHtml.slice(0, 300) }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {previews.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No listings to review. Upload a file first.</p>
          <button onClick={() => navigate('/upload')} className="mt-4 text-brand-600 font-medium hover:text-brand-700">
            Go to Upload →
          </button>
        </div>
      )}
    </div>
  );
}