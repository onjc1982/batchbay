import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth, getEbayStatus } from '../api/client';

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [ebayStatus, setEbayStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, ebay] = await Promise.all([
          checkHealth(),
          getEbayStatus().catch(() => ({ configured: false, message: 'eBay API not available' })),
        ]);
        setHealth(h);
        setEbayStatus(ebay);
      } catch (e) {
        setHealth({ status: 'error' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const steps = [
    {
      num: 1,
      title: 'Upload Spreadsheet',
      desc: 'Upload a CSV or Excel file with your card data including titles, prices, and photo URLs.',
      link: '/upload',
      linkText: 'Upload file',
    },
    {
      num: 2,
      title: 'Map Columns & Preview',
      desc: 'Map spreadsheet columns to eBay fields and preview how your listings will look.',
      link: '/upload',
      linkText: 'Map columns',
    },
    {
      num: 3,
      title: 'Customize Templates',
      desc: 'Apply your own HTML listing template with {{placeholder}} variables.',
      link: '/templates',
      linkText: 'Edit template',
    },
    {
      num: 4,
      title: 'Review & Publish',
      desc: 'Review all generated listings and publish them to eBay in one click.',
      link: '/review',
      linkText: 'Review listings',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to BatchBay</h1>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl">
          Bulk-list trading cards on eBay from a spreadsheet. Upload your CSV/Excel,
          map columns, apply your HTML template, and publish hundreds of listings in minutes.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Start Uploading
          </Link>
          <Link
            to="/templates"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set Up Template
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.num} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-lg flex items-center justify-center font-bold text-sm mb-3">
                {step.num}
              </div>
              <h3 className="font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
              <Link to={step.link} className="mt-3 inline-block text-sm text-brand-600 hover:text-brand-700 font-medium">
                {step.linkText} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500">API Status</h3>
          {loading ? (
            <p className="mt-1 text-sm text-gray-400">Checking...</p>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-gray-900">
                {health?.status === 'ok' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500">eBay Integration</h3>
          {loading ? (
            <p className="mt-1 text-sm text-gray-400">Checking...</p>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ebayStatus?.configured ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium text-gray-900">
                {ebayStatus?.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500">Quick Start</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload a CSV with columns: title, description, price, condition, photo_urls
          </p>
        </div>
      </div>
    </div>
  );
}