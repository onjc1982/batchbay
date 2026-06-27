import { useState, useEffect, useMemo } from 'react';
import { saveTemplate, getTemplates } from '../api/client';

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 24px; color: #1a1a2e;">{{title}}</h1>
  <div style="margin: 20px 0;">
    {{photos}}
  </div>
  <div style="font-size: 14px; line-height: 1.6; color: #333;">
    {{description}}
  </div>
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #666;">Condition: <strong>{{condition}}</strong></p>
    <p style="font-size: 12px; color: #666;">Price: <strong>\${{price}}</strong></p>
  </div>
</div>`;

const PLACEHOLDERS = [
  { name: '{{title}}', desc: 'Listing title' },
  { name: '{{description}}', desc: 'Listing description' },
  { name: '{{price}}', desc: 'Price value' },
  { name: '{{condition}}', desc: 'Item condition' },
  { name: '{{category}}', desc: 'eBay category ID' },
  { name: '{{photos}}', desc: 'Photo HTML (img tags output)' },
];

const DEFAULT_SAMPLE = {
  title: 'Charizard VMAX - Rainbow Rare',
  description: 'Near mint condition Charizard VMAX from Champion\'s Path. Pack fresh, immediately sleeved. High quality centering and corners.',
  price: '149.99',
  condition: 'Near Mint',
  category: '183454',
  photoUrls: [
    'https://placehold.co/600x600/3b82f6/ffffff?text=Photo+1',
    'https://placehold.co/600x600/1d4ed8/ffffff?text=Photo+2',
  ],
};

const SAMPLE_PHOTO_HTML = (urls) =>
  urls
    .map(
      (url, i) =>
        `<img src="${url}" alt="Card Photo ${i + 1}" style="max-width: 500px; margin: 5px; border-radius: 4px;" />`
    )
    .join('\n');

function renderTemplate(html, sample) {
  if (!html) return '<p style="color: #999;">No template HTML</p>';

  const photoHtml = SAMPLE_PHOTO_HTML(sample.photoUrls);

  try {
    let rendered = html
      .replace(/\{\{title\}\}/g, sample.title)
      .replace(/\{\{description\}\}/g, sample.description)
      .replace(/\{\{price\}\}/g, sample.price)
      .replace(/\{\{condition\}\}/g, sample.condition)
      .replace(/\{\{category\}\}/g, sample.category)
      .replace(/\{\{photos\}\}/g, photoHtml);

    // Style the iframe content like eBay
    rendered = `<div style="font-family: Arial, Helvetica, sans-serif;">${rendered}</div>`;

    // Check for unreplaced placeholders
    const unreplaced = html.match(/\{\{[^}]+\}\}/g);
    if (unreplaced && unreplaced.length > 0) {
      const stillMissing = rendered.match(/\{\{[^}]+\}\}/g);
      if (stillMissing && stillMissing.length > 0) {
        rendered +=
          `<div style="margin-top: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404; font-size: 13px;">
            ⚠️ Unknown placeholders detected: ${[...new Set(stillMissing)].join(', ')}
          </div>`;
      }
    }

    return rendered;
  } catch (e) {
    return `<div style="padding: 20px; background: #f8d7da; color: #721c24; border-radius: 4px;">
      Error rendering template: ${e.message}
    </div>`;
  }
}

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState('My Template');
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_TEMPLATE);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // editor | preview
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [showSampleEditor, setShowSampleEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop | mobile

  useEffect(() => {
    loadTemplates();
    const saved = sessionStorage.getItem('batchbay_template');
    if (saved) {
      try {
        const t = JSON.parse(saved);
        setTemplateName(t.name || 'My Template');
        setTemplateHtml(t.html || DEFAULT_TEMPLATE);
      } catch (e) {}
    }
  }, []);

  // Live preview computed value
  const previewHtml = useMemo(() => renderTemplate(templateHtml, sample), [templateHtml, sample]);

  async function loadTemplates() {
    try {
      const res = await getTemplates();
      setSavedTemplates(res.templates || []);
    } catch (e) {}
  }

  function loadTemplate(t) {
    setTemplateName(t.name);
    setTemplateHtml(t.html);
    setMessage('');
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await saveTemplate(templateName, templateHtml);
      sessionStorage.setItem('batchbay_template', JSON.stringify({
        name: templateName,
        html: templateHtml,
      }));
      setMessage('Template saved successfully! It will be applied when you review your listings.');
      await loadTemplates();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function insertPlaceholder(placeholder) {
    // Insert at cursor position in textarea
    const textarea = document.querySelector('.template-textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = templateHtml.substring(0, start) + placeholder + templateHtml.substring(end);
      setTemplateHtml(newVal);
      // Restore cursor position after React re-render
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }, 0);
    } else {
      setTemplateHtml(prev => prev + placeholder);
    }
  }

  function handleSampleChange(field, value) {
    setSample(prev => ({ ...prev, [field]: value }));
  }

  function handlePhotoUrlChange(index, value) {
    setSample(prev => {
      const urls = [...prev.photoUrls];
      urls[index] = value;
      return { ...prev, photoUrls: urls };
    });
  }

  function addPhotoUrl() {
    setSample(prev => ({
      ...prev,
      photoUrls: [...prev.photoUrls, 'https://placehold.co/600x600/cccccc/666666?text=Photo+' + (prev.photoUrls.length + 1)],
    }));
  }

  function removePhotoUrl(index) {
    setSample(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HTML Template Editor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a custom HTML template for your eBay listings. Use <code className="bg-gray-100 px-1 rounded text-brand-600">{'{{placeholders}}'}</code> for dynamic content.
          </p>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'editor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✏️ Editor
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          👁️ Live Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'editor' ? (
            /* Editor Tab */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="My Template"
                />
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">HTML Template</label>
              </div>
              <div className="template-input">
                <textarea
                  className="template-textarea w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  rows={22}
                  spellCheck={false}
                  placeholder="<div>{{title}}</div>"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Saving...' : '💾 Save Template'}
                </button>
                <button
                  onClick={() => {
                    setTemplateHtml(DEFAULT_TEMPLATE);
                    setTemplateName('My Template');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  ↩ Reset to Default
                </button>
              </div>
            </div>
          ) : (
            /* Preview Tab */
            <div className="space-y-4">
              {/* Preview mode toggle */}
              <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                <span className="text-sm text-gray-500">Preview mode:</span>
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1.5 rounded-md text-sm ${previewMode === 'desktop' ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🖥 Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1.5 rounded-md text-sm ${previewMode === 'mobile' ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📱 Mobile (375px)
                </button>
                <button
                  onClick={() => setShowSampleEditor(!showSampleEditor)}
                  className="ml-auto px-3 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-700 border border-gray-200"
                >
                  {showSampleEditor ? 'Hide Sample Data' : 'Edit Sample Data'}
                </button>
              </div>

              {/* Sample data editor */}
              {showSampleEditor && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sample Data for Preview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input type="text" value={sample.title} onChange={(e) => handleSampleChange('title', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                      <input type="text" value={sample.price} onChange={(e) => handleSampleChange('price', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                      <input type="text" value={sample.condition} onChange={(e) => handleSampleChange('condition', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <input type="text" value={sample.category} onChange={(e) => handleSampleChange('category', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea value={sample.description} onChange={(e) => handleSampleChange('description', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Photo URLs ({sample.photoUrls.length})
                        <button onClick={addPhotoUrl} className="ml-2 text-brand-600 hover:text-brand-700">+ Add</button>
                      </label>
                      {sample.photoUrls.map((url, i) => (
                        <div key={i} className="flex gap-2 mb-1.5">
                          <input type="text" value={url} onChange={(e) => handlePhotoUrlChange(i, e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono text-xs" />
                          {sample.photoUrls.length > 1 && (
                            <button onClick={() => removePhotoUrl(i)} className="text-red-500 hover:text-red-700 text-xs px-2">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Live preview */}
              <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''
              }`}>
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">
                    {previewMode === 'mobile' ? '📱 Mobile Preview' : '🖥 Desktop Preview'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new URL('data:text/html;base64,').protocol === 'data:' ? 'Live rendering' : 'iframe preview'}
                  </span>
                </div>
                <div className="p-4 max-h-[600px] overflow-y-auto bg-white">
                  <iframe
                    title="Template Preview"
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ minHeight: '400px', height: 'auto' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Placeholders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">📌 Available Placeholders</h3>
            <p className="text-xs text-gray-500 mb-3">Click to insert at cursor position:</p>
            <div className="space-y-2">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p.name}
                  onClick={() => insertPlaceholder(p.name)}
                  className="w-full text-left px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm border border-gray-100"
                  title={`Click to insert ${p.name}`}
                >
                  <code className="text-brand-700 font-mono text-xs font-semibold">{p.name}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Templates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">💾 Saved Templates</h3>
            <p className="text-xs text-gray-400 mb-3">Click to load a saved template:</p>
            {savedTemplates.length === 0 ? (
              <p className="text-xs text-gray-400">No saved templates yet. Create your template and hit "Save Template".</p>
            ) : (
              <div className="space-y-2">
                {savedTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                  >
                    <p className="text-sm font-medium text-gray-700 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">Saved {new Date(t.createdAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-brand-50 rounded-xl border border-brand-200 p-5">
            <h3 className="font-semibold text-brand-800 text-sm mb-2">💡 Template Tips</h3>
            <ul className="text-xs text-brand-700 space-y-1.5">
              <li>✓ Use {'{{title}}'} for the listing title</li>
              <li>✓ {'{{photos}}'} renders {'<img>'} tags for all photos</li>
              <li>✓ {'{{description}}'} can include HTML formatting</li>
              <li>✓ Switch to <strong>Live Preview</strong> tab to see changes instantly</li>
              <li>✓ Edit sample data to match your actual card data</li>
              <li>✓ Save before going to Review to apply the template</li>
              <li>✦ eBay supports basic HTML + inline CSS in descriptions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}