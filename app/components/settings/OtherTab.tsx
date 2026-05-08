"use client";

import { useSettingsContext } from "../SettingsContext";
import { useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export default function OtherTab() {
  const { reset, exportJson, importJson } = useSettingsContext();
  const { tr } = useTranslation();
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
      alert(tr("stImported"));
    } else {
      alert(tr("stImportFail"));
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("hanazar-settings-v1");
    alert(tr("stCacheCleared"));
  };

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stReset")}</span>
        <p className="settingDesc">{tr("stResetDesc")}</p>
        <button className="settingsBtn danger" onClick={reset}>
          {tr("stResetBtn")}
        </button>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stExportImport")}</span>
        <div className="dataActions">
          <button className="settingsBtn" onClick={handleCopy}>{tr("stCopyJson")}</button>
          <button className="settingsBtn" onClick={handleExport}>{tr("stDownloadJson")}</button>
          <button className="settingsBtn" onClick={() => setShowImport((v) => !v)}>
            {showImport ? tr("stCancel") : tr("stImportJson")}
          </button>
        </div>
        {showImport && (
          <div className="importArea">
            <textarea
              className="settingsTextarea"
              placeholder={tr("stImportPlaceholder")}
              value={importArea}
              onChange={(e) => setImportArea(e.target.value)}
              rows={6}
            />
            <button className="settingsBtn primary" onClick={handleImport}>
              {tr("stConfirmImport")}
            </button>
          </div>
        )}
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stCache")}</span>
        <p className="settingDesc">{tr("stCacheDesc")}</p>
        <button className="settingsBtn danger" onClick={handleClearCache}>
          {tr("stClearCache")}
        </button>
      </div>
    </div>
  );
}
