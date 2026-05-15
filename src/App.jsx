import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function App() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [fileName, setFileName] = useState("projects.csv");
  const [showMap, setShowMap] = useState(false);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const hiddenColumns = ["latitude", "longitude", "lat", "lng", "long"];

  const normalize = (text) => String(text || "").trim().toLowerCase();

  const isHiddenColumn = (column) => hiddenColumns.includes(normalize(column));

  const visibleColumns = columns.filter((column) => !isHiddenColumn(column));

  const getLat = (row) =>
    row.latitude || row.Latitude || row.LAT || row.lat || row.Lat;

  const getLng = (row) =>
    row.longitude ||
    row.Longitude ||
    row.LONG ||
    row.lng ||
    row.Lng ||
    row.long;

  const loadCSVData = (data, name = "Uploaded CSV") => {
    const cleanData = data.filter((row) =>
      Object.values(row).some((value) => String(value || "").trim() !== "")
    );

    const detectedColumns = cleanData.length > 0 ? Object.keys(cleanData[0]) : [];
    const displayColumns = detectedColumns.filter(
      (column) => !isHiddenColumn(column)
    );

    setRows(cleanData);
    setColumns(detectedColumns);

    // Default: show first 6 useful columns only
    setSelectedColumns(displayColumns.slice(0, 6));

    setFileName(name);
    setSearch("");
    setFilters({});
    setShowMap(false);
    setExpandedRow(null);
  };

  useEffect(() => {
    Papa.parse(`${import.meta.env.BASE_URL}data/projects.csv`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        loadCSVData(result.data, "projects.csv");
      },
    });
  }, []);

  const getUniqueValues = (columnName) => {
    return [
      ...new Set(
        rows
          .map((row) => row[columnName])
          .filter((value) => String(value || "").trim() !== "")
      ),
    ].sort();
  };

  const filterColumns = selectedColumns;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        selectedColumns.some((column) =>
          String(row[column] || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

      const matchesFilters = Object.entries(filters).every(
        ([column, selectedValue]) => {
          if (!selectedValue) return true;
          return String(row[column] || "") === String(selectedValue);
        }
      );

      return matchesSearch && matchesFilters;
    });
  }, [rows, search, filters, selectedColumns]);

  const mapRows = filteredRows.filter((row) => getLat(row) && getLng(row));

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        loadCSVData(result.data, file.name);
      },
    });
  };

  const updateFilter = (column, value) => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      [column]: value,
    }));
  };

  const toggleColumn = (column) => {
    setSelectedColumns((previousColumns) => {
      if (previousColumns.includes(column)) {
        return previousColumns.filter((item) => item !== column);
      }

      return [...previousColumns, column];
    });
  };

  const selectFirstColumns = () => {
    setSelectedColumns(visibleColumns.slice(0, 6));
  };

  const selectAllColumns = () => {
    setSelectedColumns(visibleColumns);
  };

  const clearColumns = () => {
    setSelectedColumns([]);
  };

  const downloadCSV = () => {
  if (!filteredRows.length) {
    alert("No filtered data to download.");
    return;
  }

  const exportData = filteredRows.map((row) => {
    const newRow = {};

    selectedColumns.forEach((column) => {
      newRow[column] = row[column];
    });

    return newRow;
  });

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `filtered-${fileName.replace(".csv", "")}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  return (
    <div className="page">
      <header className="hero">
        <h1>Policy Map Tool</h1>
        <p>
          Upload any CSV file, choose columns, filter the data, download results,
          and view selected locations on a map.
        </p>
      </header>

      <section className="toolbar">
        <div className="toolbarTop">
          <label className="uploadBox">
            Upload CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} />
          </label>

          <button
            className="secondaryButton"
            onClick={() => setShowColumnPanel((prev) => !prev)}
          >
            {showColumnPanel ? "Hide Columns" : "Choose Columns"}
          </button>

          <div className="fileBadge">
            Current file: <strong>{fileName}</strong>
          </div>
        </div>

        {showColumnPanel && (
          <div className="columnPanel">
            <div className="columnPanelHeader">
              <strong>Select columns to display</strong>

              <div className="columnActions">
                <button onClick={selectFirstColumns}>Default</button>
                <button onClick={selectAllColumns}>All</button>
                <button onClick={clearColumns}>Clear</button>
              </div>
            </div>

            <div className="columnCheckboxGrid">
              {visibleColumns.map((column) => (
                <label key={column} className="columnCheckbox">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="filterGrid">
          {filterColumns.map((column) => (
            <select
              key={column}
              value={filters[column] || ""}
              onChange={(e) => updateFilter(column, e.target.value)}
            >
              <option value="">{column}: All</option>
              {getUniqueValues(column).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}

          <input
            placeholder="Search selected columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button onClick={downloadCSV}>Download CSV</button>

          <button onClick={() => setShowMap((prev) => !prev)}>
            {showMap ? "Close Map" : "Show on Map"}
          </button>
        </div>
      </section>

      <div className="resultInfo">
        Showing <strong>{filteredRows.length}</strong> result(s)
      </div>

      {showMap && (
        <div className="mapBox">
          <MapContainer
            center={[45.4215, -75.6972]}
            zoom={5}
            scrollWheelZoom={true}
            className="map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapRows.map((row, index) => (
              <Marker
                key={index}
                position={[Number(getLat(row)), Number(getLng(row))]}
                icon={markerIcon}
              >
                <Popup>
                  {selectedColumns.slice(0, 6).map((column) => (
                    <div key={column}>
                      <strong>{column}:</strong> {row[column]}
                    </div>
                  ))}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="tableWrapper">
        {selectedColumns.length === 0 ? (
          <div className="emptyState">
            Choose at least one column to display the table.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="expandColumn"></th>
                {selectedColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <>
                  <tr key={`row-${rowIndex}`}>
                    <td className="expandColumn">
                      <button
                        className="expandButton"
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === rowIndex ? null : rowIndex
                          )
                        }
                      >
                        {expandedRow === rowIndex ? "−" : "+"}
                      </button>
                    </td>

                    {selectedColumns.map((column) => (
                     <td
                      key={column}
                      className={
                        column.toLowerCase().includes("description") ||
                        column.toLowerCase().includes("policy") ||
                        column.toLowerCase().includes("detail") ||
                        column.toLowerCase().includes("note")
                          ? "textColumn"
                          : ""
                      }
                    >
                        <div className="cellText">{row[column]}</div>
                      </td>
                    ))}
                  </tr>

                  {expandedRow === rowIndex && (
                    <tr key={`details-${rowIndex}`}>
                      <td colSpan={selectedColumns.length + 1}>
                        <div className="detailsBox">
                          {visibleColumns.map((column) => (
                            <div key={column} className="detailItem">
                              <strong>{column}</strong>
                              <span>{row[column] || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;