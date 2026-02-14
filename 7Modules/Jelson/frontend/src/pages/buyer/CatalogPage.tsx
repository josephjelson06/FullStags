import { FormEvent, useState } from "react";
import api from "../../api/client";
import type { CatalogItem } from "../../types";

const CatalogPage = () => {
  const [partNumber, setPartNumber] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searched, setSearched] = useState(false);

  const runSearch = async (query: string) => {
    const response = await api.get<CatalogItem[]>("/suppliers/catalog", {
      params: query.trim() ? { part_number: query.trim() } : {},
    });
    setResults(response.data);
    setSearched(true);
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    await runSearch(partNumber);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form className="card" onSubmit={handleSearch} style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginTop: 0 }}>Catalog Search</h2>
        <div>
          <label>Part number</label>
          <input
            placeholder="Example: SKF-6205"
            value={partNumber}
            onChange={(event) => setPartNumber(event.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit">Search</button>
          <button type="button" className="secondary" onClick={() => void runSearch("")}>
            Show All
          </button>
        </div>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Results</h3>
        {!searched ? (
          <div style={{ color: "var(--muted)" }}>Run a search to view matching catalog items.</div>
        ) : results.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No catalog items found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Part number</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Lead time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.id}>
                  <td>{item.part_name}</td>
                  <td>{item.part_number}</td>
                  <td>{item.unit_price}</td>
                  <td>{item.quantity_in_stock}</td>
                  <td>{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
