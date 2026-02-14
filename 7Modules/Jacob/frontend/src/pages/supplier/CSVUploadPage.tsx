import { DragEvent, useEffect, useMemo, useState } from "react";
import { uploadCatalogCsv } from "../../api/inventory";
import { CSVUploadResponse } from "../../types/inventory";

const templateHeaders = [
  "part_name",
  "part_number",
  "category",
  "brand",
  "unit_price",
  "quantity",
  "min_order_qty",
  "lead_time_hours",
];

function makeTemplateCsv() {
  return `${templateHeaders.join(",")}\n`;
}

export default function CSVUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CSVUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      handleFile(file);
    } else {
      setError("Please drop a valid CSV file.");
    }
  };

  const upload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const response = await uploadCatalogCsv(selectedFile);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV upload failed");
    } finally {
      setUploading(false);
    }
  };

  const templateHref = useMemo(() => {
    const blob = new Blob([makeTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => {
    return () => URL.revokeObjectURL(templateHref);
  }, [templateHref]);

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>CSV Bulk Upload</h1>
        <p style={{ color: "var(--muted)" }}>
          Upload supplier inventory from CSV. Existing part numbers update in place.
        </p>
        <a className="button secondary" href={templateHref} download="inventory_template.csv">
          Download Template
        </a>
      </div>

      <div
        className="dropzone"
        style={{ borderColor: dragging ? "var(--accent)" : undefined }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p style={{ marginTop: 0 }}>Drag and drop CSV here, or choose file manually.</p>
        <input
          type="file"
          accept=".csv"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
        <p style={{ color: "var(--muted)" }}>
          {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
        </p>
        <button className="button" disabled={!selectedFile || uploading} onClick={upload}>
          Upload CSV
        </button>
      </div>

      {uploading ? (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div className="spinner" />
          <div>Processing rows and validating records...</div>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="card grid grid-4">
            <div>
              <div style={{ color: "var(--muted)" }}>Total Rows</div>
              <strong>{result.total_rows}</strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>Successful</div>
              <strong>{result.successful}</strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>Failed</div>
              <strong>{result.failed}</strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>Success Rate</div>
              <strong>
                {result.total_rows > 0
                  ? `${Math.round((result.successful / result.total_rows) * 100)}%`
                  : "0%"}
              </strong>
            </div>
          </div>

          {result.errors.length > 0 ? (
            <div className="card" style={{ overflowX: "auto" }}>
              <h2 style={{ marginTop: 0 }}>Failed Rows</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Error</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((entry) => (
                    <tr key={`${entry.row_number}-${entry.error}`}>
                      <td>{entry.row_number}</td>
                      <td>{entry.error}</td>
                      <td>
                        <code>{JSON.stringify(entry.row_data ?? {})}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
