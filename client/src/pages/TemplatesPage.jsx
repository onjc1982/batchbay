import { useState, useEffect } from 'react';
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
    <p style="font-size: 12px; color: #666;">Price: <strong>${{price}}</strong></p>
  </div>
</div>`;

const PLACEHOLDERS = [
  { name: '{{title}}', desc: 'Listing title' },
  { name: '{{description}}', desc: 'Listing description' },
  { name: '{{price}}', desc: 'Price value' },
  { name: '{{condition}}', desc: 'Item condition' },
  { name: '{{category}}', desc: 'eBay category' },
  { name: '{{photos}}', desc: 'Photo HTML (img tags)' },
];

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState('My Template');
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_TEMPLATE);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  async function loadTemplates() {
    try {
      const res = await getTemplates();
      setSavedTemplates(res.templates || []);
    } catch (e) {}
  }

  function loadTemplate(t) {
    setTemplateName(t.name);
    setTemplateHtml(t.html);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await saveTemplate(templateName, templateHtml);
      // Also save to session for the review page
      sessionStorage.setItem('batchbay_template', JSON.stringify({
        name: templateName,
        html: templateHtml,
      }));
      setMessage('Template saved successfully!');
      await loadTemplates();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function insertPlaceholder(placeholder) {
    setTemplateHtml(prev => prev + placeholder);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HTML Template Editor</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a custom HTML template for your eBay listings. Use {'{{placeholders}}'} for dynamic content.
        </p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML Template</label>
              <div className="template-input">
                <textarea
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  rows={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => {
                  setTemplateHtml(DEFAULT_TEMPLATE);
                  setTemplateName('My Template');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Placeholders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Available Placeholders</h3>
            <p className="text-xs text-gray-500 mb-3">Click to insert or type manually:</p>
            <div className="space-y-2">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p.name}
                  onClick={() => insertPlaceholder(p.name)}
                  className="w-full text-left px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <code className="text-brand-700 font-mono text-xs">{p.name}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Templates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Saved Templates</h3>
            {savedTemplates.length === 0 ? (
              <p className="text-xs text-gray-400">No saved templates yet</p>
            ) : (
              <div className="space-y-2">
                {savedTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-700">{t.name}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Instructions */}
          <div className="bg-brand-50 rounded-xl border border-brand-200 p-5">
            <h3 className="font-semibold text-brand-800 text-sm mb-2">💡 Template Tips</h3>
            <ul className="text-xs text-brand-700 space-y-1.5">
              <li>Use <code className="bg-brand-100 px-1 rounded">{'{{title}}'}</code> for the listing title</li>
              <li>Use <code className="bg-brand-100 px-1 rounded">{'{{photos}}'}</code> for photo HTML</li>
              <li>Save your template before going to Review</li>
              <li>Templates are stored in your browser session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}