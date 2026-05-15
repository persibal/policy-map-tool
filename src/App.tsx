import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [rows, setRows] = useState([]);
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Papa.parse("/data/projects.csv", {
      download: true,
      header: true,
      complete: (result) => setRows(result.data.filter((r) => r.name)),
    });
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return (
        (!province || row.province === province) &&
        (!status || row.status === status) &&
        (!search ||
          row.name?.toLowerCase().includes(search.toLowerCase()) ||
          row.city?.toLowerCase().includes(search.toLowerCase()) ||
          row.description?.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [rows, province, status, search]);

  const provinces = [...new Set(rows.map((r) => r.province).filter(Boolean))];
  const statuses = [...new Set(rows.map((r) => r.status).filter(Boolean))];

  const downloadCSV = () => {
    const csv = Papa.unparse(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "filtered-results.csv";
    link.click();
  };

  return (
    <div className="page">
      <h1>Policy Map Tool</h1>
      <p>Filter the CSV data, view the results, and download the filtered table.</p>

      <div className="filters">
        <input
          placeholder="Search name, city, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="">All Provinces</option>
          {provinces.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button onClick={downloadCSV}>Download CSV</button>
      </div>

      <p>
        Showing <strong>{filteredRows.length}</strong> result(s)
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Province</th>
            <th>City</th>
            <th>Category</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((row, index) => (
            <tr key={index}>
              <td>{row.name}</td>
              <td>{row.province}</td>
              <td>{row.city}</td>
              <td>{row.category}</td>
              <td>{row.status}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;