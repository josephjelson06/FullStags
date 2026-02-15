import { useState } from 'react';
import { request } from '@/services/api/client';
import { useNavigate } from 'react-router-dom';

export function BulkUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported?: number; errors?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!file) { setError('Please select a CSV file.'); return; }
    setUploading(true); setError(null); setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await request<{ imported: number; errors: string[] }>('/api/inventory/csv-upload', {
        method: 'POST',
        body: formData,
        headers: {},
      });
      setResult(res);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate('/supplier/inventory')} className="text-sm text-blue-600 hover:underline">← Back to Inventory</button>
      <h1 className="text-2xl font-bold">Bulk CSV Upload</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="font-semibold mb-2">CSV Format</h2>
        <p className="text-sm text-gray-500 mb-3">Upload a CSV file with the following columns:</p>
        <code className="block rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
          part_name, part_number, brand, category, unit_price, quantity_in_stock, lead_time_hours
        </code>
      </div>

      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-900">
        <input type="file" accept=".csv" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }} className="block mx-auto text-sm" />
        {file && <p className="mt-2 text-sm text-gray-500">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}

      {result && (
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/30">
          <div className="text-sm font-medium text-green-800 dark:text-green-300">✅ {result.imported} parts imported</div>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <button className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => void upload()} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>
    </div>
  );
}
