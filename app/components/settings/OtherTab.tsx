"use client";

import { useSettingsContext } from "../SettingsContext";
import { useState } from "react";

export default function OtherTab() {
  const { reset, exportJson, importJson } = useSettingsContext();
  const [importArea, setImportArea] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hanazar-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportJson());
  };

  const handleImport = () => {
    const ok = importJson(importArea);
    if (ok) {
      setImportArea("");
      setShowImport(false);
      alert("Settings imported successfully.");
    } else {
      alert("Invalid JSON. Please check your config.");
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    alert("Local cache cleared.");
  };

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">Reset</span>
        <p className="settingDesc">Restore all settings to their default values. This cannot be undone.</p>
        <button className="settingsBtn danger" onClick={reset}>
          Reset All Settings
        </button>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">Export / Import</span>
        <div className="dataActions">
          <button className="settingsBtn" onClick={handleCopy}>Copy JSON</button>
          <button className="settingsBtn" onClick={handleExport}>Download JSON</button>
          <button className="settingsBtn" onClick={() => setShowImport((v) => !v)}>
            {showImport ? "Cancel" : "Import JSON"}
          </button>
        </div>
        {showImport && (
          <div className="importArea">
            <textarea
              className="settingsTextarea"
              placeholder="Paste your settings JSON here..."
              value={importArea}
              onChange={(e) => setImportArea(e.target.value)}
              rows={6}
            />
            <button className="settingsBtn primary" onClick={handleImport}>
              Confirm Import
            </button>
          </div>
        )}
      </div>

      <div className="settingGroup">
        <span className="settingLabel">Cache</span>
        <p className="settingDesc">Clear all locally stored data including settings.</p>
        <button className="settingsBtn danger" onClick={handleClearCache}>
          Clear Local Cache
        </button>
      </div>
    </div>
  );
}
