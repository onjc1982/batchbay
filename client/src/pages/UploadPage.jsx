import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../api/client';

const EBAY_FIELDS = [
  { key: 'title', label: 'Title', required: true, hint: 'Card name / listing title' },
  { key: 'description', label: 'Description', required: false, hint: 'Listing description' },
  { key: 'price', label: 'Price', required: true, hint: 'Listing price (numeric)' },
  { key: 'condition', label: 'Condition', required: false, hint: 'e.g. New, Used, Graded' },
  { key: 'category', label: 'Category ID', required: false, hint: 'eBay category ID' },
  { key: 'photoUrls', label: 'Photo URLs', required: false, hint: 'URLs separated by comma/newline' },
  { key: 'quantity', label: 'Quantity', required: false, hint: 'Default: 1' },
  { key: 'sku', label: 'SKU', required: false, hint: 'Your internal SKU' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [step, setStep] = useState('upload'); // upload | map | done

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setError('');
      setParsedData(null);
      setStep('upload');
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await uploadFile(file);
      setParsedData(result);

      // Auto-map columns by best-guess
      const autoMap = {};
      const cols = result.columns.map(c => c.toLowerCase().trim());
      EBAY_FIELDS.forEach(field => {
        const idx = cols.findIndex(c =>
          c === field.key ||
          c === field.key.replace(/([A-Z])/g, '_$1').toLowerCase() ||
          c.includes(field.key.toLowerCase())
        );
        if (idx >= 0) {
          autoMap[field.key] = result.columns[idx];
        }
      });
      setColumnMapping(autoMap);
      setStep('map');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleMappingChange = (fieldKey, columnName) => {
    setColumnMapping(prev => ({ ...prev, [fieldKey]: columnName }));
  };

  const handleProceed = () => {
    // Save to session storage for review page
    sessionStorage.setItem('batchbay_parsed_data', JSON.stringify(parsedData));
    sessionStorage.setItem('batchbay_column_mapping', JSON.stringify(columnMapping));
    navigate('/review');
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setStep('upload');
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Spreadsheet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV or Excel file containing your card data. Supported formats: .csv, .xlsx, .xls
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <label className="cursor-pointer">
              <div className="px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors inline-block">
                {file ? 'Change File' : 'Select File'}
              </div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </label>
            {file && (
              <p className="mt-3 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            {file && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="mt-4 px-8 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Uploading & Parsing...' : 'Upload & Parse'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && parsedData && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Data Preview
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({parsedData.totalRows} rows, {parsedData.columns.length} columns)
                </span>
              </h2>
              <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
                Upload different file
              </button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {parsedData.columns.map(col => (
                      <th key={col} className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {parsedData.columns.map(col => (
                        <td key={col} className="px-4 py-2 text-gray-700 max-w-xs truncate">
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.totalRows > 5 && (
              <p className="mt-2 text-xs text-gray-400">Showing first 5 of {parsedData.totalRows} rows</p>
            )}
          </div>

          {/* Column Mapping */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Columns to eBay Fields</h2>
            <p className="text-sm text-gray-500 mb-4">
              Match your spreadsheet columns to the eBay listing fields. Required fields are marked with *.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EBAY_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">-- Skip / Not mapped --</option>
                    {parsedData.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {field.hint && (
                    <p className="mt-0.5 text-xs text-gray-400">{field.hint}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {Object.keys(columnMapping).filter(k => columnMapping[k]).length} of {EBAY_FIELDS.length} fields mapped
              </p>
              <div className="flex gap-3">
                <button onClick={handleReset} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  disabled={!columnMapping.title || !columnMapping.price}
                  className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm"
                >
                  Preview & Review →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}