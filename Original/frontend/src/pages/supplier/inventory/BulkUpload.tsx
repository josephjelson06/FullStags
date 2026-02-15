import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadCatalogCsv } from '@/services/api/inventory';

export function BulkUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    total_rows: number;
    successful: number;
    failed: number;
    errors: Array<{ row_number: number; error: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!file) {
      setError('Please select a CSV file.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const response = await uploadCatalogCsv(file);
      setResult(response);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => navigate('/supplier/inventory')} className="text-sm text-blue-600 hover:underline">
        Back to Inventory
      </button>
      <h1 className="text-3xl font-bold">Bulk CSV Upload</h1>

      <div className="surface-card rounded-2xl p-6">
        <h2 className="mb-2 font-semibold">CSV Format</h2>
        <p className="mb-3 text-sm text-gray-400">Upload a CSV file with these columns:</p>
        <code className="block rounded bg-gray-100 p-3 text-xs">
          category_id, part_name, part_number, brand, unit_price, quantity_in_stock, min_order_quantity, lead_time_hours
        </code>
      </div>

      <div className="surface-card rounded-lg border-2 border-dashed p-8 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="mx-auto block text-sm"
        />
        {file ? <p className="mt-2 text-sm text-gray-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p> : null}
      </div>

      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">
            Processed {result.total_rows} rows, imported {result.successful}, failed {result.failed}
          </div>
          {result.errors.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm text-red-600">
              {result.errors.map((row) => <li key={`${row.row_number}-${row.error}`}>Row {row.row_number}: {row.error}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      <button
        className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={() => void upload()}
        disabled={uploading || !file}
      >
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>
    </div>
  );
}
