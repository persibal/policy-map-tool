import { Fragment, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const hiddenColumns = ["latitude", "longitude", "lat", "lng", "long"];
const urlPattern = /^https?:\/\//i;

const normalize = (text) => String(text || "").trim().toLowerCase();

const isHiddenColumn = (column) => hiddenColumns.includes(normalize(column));

const getColumnValue = (row, aliases) => {
  const exactColumn = Object.keys(row).find((column) =>
    aliases.some((alias) => normalize(column) === alias)
  );

  if (exactColumn && row[exactColumn]) return row[exactColumn];

  const partialColumn = Object.keys(row).find((column) =>
    aliases.some((alias) => normalize(column).includes(alias))
  );

  return partialColumn ? row[partialColumn] : "";
};

const splitListValue = (value) =>
  String(value || "")
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const isImageColumn = (column) => {
  const name = normalize(column);
  return ["image", "photo", "picture", "gallery", "thumbnail"].some((term) =>
    name.includes(term)
  );
};

const isLinkColumn = (column) => {
  const name = normalize(column);
  return ["website", "url", "link", "document", "attachment", "source"].some(
    (term) => name.includes(term)
  );
};

const getLat = (row) => getColumnValue(row, ["latitude", "lat"]);

const getLng = (row) =>
  getColumnValue(row, ["longitude", "lng", "long", "lon"]);

const getTitle = (row) =>
  getColumnValue(row, ["name", "project name", "policy name", "title", "project"]);

const getCity = (row) => getColumnValue(row, ["city", "town", "municipality"]);

const getCountry = (row) =>
  getColumnValue(row, ["country", "nation", "province", "state", "region"]);

const getCategory = (row) => getColumnValue(row, ["category", "type", "theme"]);

const getStatus = (row) => getColumnValue(row, ["status", "stage", "phase"]);

const getDescription = (row) =>
  getColumnValue(row, ["description", "summary", "details", "overview", "notes"]);

const getContact = (row) =>
  getColumnValue(row, ["contact", "email", "phone", "organization", "owner"]);

const getTags = (row) => getColumnValue(row, ["tags", "keywords", "topics"]);

function MapFocus({ row }) {
  const map = useMap();

  useEffect(() => {
    if (!row) return;

    const lat = Number(getLat(row));
    const lng = Number(getLng(row));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 6), { duration: 0.6 });
    }
  }, [map, row]);

  return null;
}

function DetailPanel({ row, visibleColumns, onClose, onExport }) {
  if (!row) {
    return (
      <aside className="detailPanel emptyDetailPanel">
        <div className="panelEyebrow">Location detail</div>
        <h2>Select a marker</h2>
        <p>
          Click any map marker or the “View details” button in the table to open
          a full project or policy profile with photos, links, contact info, and
          all CSV fields.
        </p>
      </aside>
    );
  }

  const title = getTitle(row) || "Untitled location";
  const city = getCity(row);
  const country = getCountry(row);
  const category = getCategory(row);
  const status = getStatus(row);
  const description = getDescription(row);
  const contact = getContact(row);
  const tags = splitListValue(getTags(row));
  const photos = visibleColumns
    .filter(isImageColumn)
    .flatMap((column) => splitListValue(row[column]));
  const links = visibleColumns
    .filter((column) => isLinkColumn(column) || urlPattern.test(String(row[column] || "")))
    .flatMap((column) =>
      splitListValue(row[column]).map((url) => ({ label: column, url }))
    )
    .filter(({ url }) => urlPattern.test(url));
  const mainFields = [
    { label: "Location", value: [city, country].filter(Boolean).join(", ") },
    { label: "Category / Type", value: category },
    { label: "Status", value: status },
    { label: "Contact", value: contact },
  ];

  return (
    <aside className="detailPanel">
      <div className="detailPanelHeader">
        <div>
          <div className="panelEyebrow">Location detail</div>
          <h2>{title}</h2>
        </div>
        <button className="iconButton" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </div>

      <div className="photoFrame">
        {photos.length > 0 ? (
          <img src={photos[0]} alt={title} />
        ) : (
          <div className="photoPlaceholder">No photo URL in this row</div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="photoStrip">
          {photos.slice(1, 5).map((photo) => (
            <img key={photo} src={photo} alt={`${title} gallery`} />
          ))}
        </div>
      )}

      <div className="summaryGrid">
        {mainFields.map((field) => (
          <div key={field.label} className="summaryItem">
            <span>{field.label}</span>
            <strong>{field.value || "—"}</strong>
          </div>
        ))}
      </div>

      {description && (
        <section className="panelSection">
          <h3>Description</h3>
          <p>{description}</p>
        </section>
      )}

      {tags.length > 0 && (
        <section className="panelSection">
          <h3>Tags</h3>
          <div className="tagList">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section className="panelSection">
          <h3>Documents & links</h3>
          <div className="linkList">
            {links.map(({ label, url }) => (
              <a key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer">
                {label}: {url}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="panelSection">
        <div className="sectionTitleRow">
          <h3>All fields</h3>
          <button className="textButton" onClick={onExport}>
            Export details
          </button>
        </div>
        <div className="allFieldsList">
          {visibleColumns.map((column) => (
            <div key={column} className="allFieldItem">
              <strong>{column}</strong>
              <span>{row[column] || "—"}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function App() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [fileName, setFileName] = useState("projects.csv");
  const [showMap, setShowMap] = useState(true);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const visibleColumns = columns.filter((column) => !isHiddenColumn(column));

  const loadCSVData = (data, name = "Uploaded CSV") => {
    const cleanData = data
      .filter((row) =>
        Object.values(row).some((value) => String(value || "").trim() !== "")
      )
      .map((row, index) => ({ ...row, __rowId: `${name}-${index}` }));

    const detectedColumns =
      cleanData.length > 0
        ? Object.keys(cleanData[0]).filter((column) => column !== "__rowId")
        : [];
    const displayColumns = detectedColumns.filter(
      (column) => !isHiddenColumn(column)
    );

    setRows(cleanData);
    setColumns(detectedColumns);

    setSelectedColumns(displayColumns.slice(0, 6));

    setFileName(name);
    setSearch("");
    setFilters({});
    setShowMap(true);
    setExpandedRow(null);
    setSelectedRowId(cleanData[0]?.__rowId || null);
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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const searchableColumns = selectedColumns.length ? selectedColumns : visibleColumns;
      const matchesSearch =
        !search ||
        searchableColumns.some((column) =>
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
  }, [rows, search, filters, selectedColumns, visibleColumns]);

  const mapRows = filteredRows.filter((row) => {
    const lat = Number(getLat(row));
    const lng = Number(getLng(row));
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const selectedRow =
    filteredRows.find((row) => row.__rowId === selectedRowId) ||
    mapRows[0] ||
    filteredRows[0] ||
    null;

  const mapCenter = selectedRow
    ? [Number(getLat(selectedRow)) || 45.4215, Number(getLng(selectedRow)) || -75.6972]
    : [45.4215, -75.6972];

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

    const columnsToExport = selectedColumns.length ? selectedColumns : visibleColumns;
    const exportData = filteredRows.map((row) => {
      const newRow = {};

      columnsToExport.forEach((column) => {
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

  const exportSelectedDetails = () => {
    if (!selectedRow) return;

    const detailData = visibleColumns.reduce((details, column) => {
      details[column] = selectedRow[column] || "";
      return details;
    }, {});
    const blob = new Blob([JSON.stringify(detailData, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const safeTitle = String(getTitle(selectedRow) || "location-details")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "location-details"}.json`;
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
          Upload any CSV file, turn rows into map markers, and click a location
          to review photos, documents, contact details, tags, and every selected
          field in a right-side profile panel.
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
          {selectedColumns.map((column) => (
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
        Showing <strong>{filteredRows.length}</strong> result(s) with{" "}
        <strong>{mapRows.length}</strong> mapped location(s)
      </div>

      {showMap && (
        <div className="mapDetailLayout">
          <div className="mapBox">
            <MapContainer
              center={mapCenter}
              zoom={5}
              scrollWheelZoom={true}
              className="map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFocus row={selectedRow} />

              {mapRows.map((row) => (
                <Marker
                  key={row.__rowId}
                  position={[Number(getLat(row)), Number(getLng(row))]}
                  icon={markerIcon}
                  eventHandlers={{
                    click: () => setSelectedRowId(row.__rowId),
                  }}
                >
                  <Popup>
                    <div className="popupCard">
                      <strong>{getTitle(row) || "Location"}</strong>
                      {[getCity(row), getCountry(row)].filter(Boolean).join(", ")}
                      <button onClick={() => setSelectedRowId(row.__rowId)}>
                        View details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <DetailPanel
            row={selectedRow}
            visibleColumns={visibleColumns}
            onClose={() => setSelectedRowId(null)}
            onExport={exportSelectedDetails}
          />
        </div>
      )}

      <div className="tableWrapper">
        {selectedColumns.length === 0 ? (
          <div className="emptyState">
            Choose at least one column to display the table. The map detail panel
            can still use all available CSV columns.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="expandColumn"></th>
                <th className="actionColumn">Details</th>
                {selectedColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <Fragment key={row.__rowId}>
                  <tr className={row.__rowId === selectedRowId ? "selectedRow" : ""}>
                    <td className="expandColumn">
                      <button
                        className="expandButton"
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === row.__rowId ? null : row.__rowId
                          )
                        }
                      >
                        {expandedRow === row.__rowId ? "−" : "+"}
                      </button>
                    </td>
                    <td className="actionColumn">
                      <button
                        className="viewButton"
                        onClick={() => {
                          setSelectedRowId(row.__rowId);
                          setShowMap(true);
                        }}
                      >
                        View details
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

                  {expandedRow === row.__rowId && (
                    <tr key={`details-${rowIndex}`}>
                      <td colSpan={selectedColumns.length + 2}>
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
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
