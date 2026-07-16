"use client";

import { useSettingsContext } from "../SettingsContext";
import { useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export default function OtherTab() {
  const { reset, exportJson, importJson } = useSettingsContext();
  const { tr } = useTranslation();
  const [importArea, setImportArea] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [status, setStatus] = useState("");

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hanazar-settings.json";
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus(tr("stDownloaded"));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson());
      setStatus(tr("stCopied"));
    } catch {
      setImportArea(exportJson());
      setShowImport(true);
      setStatus(tr("stCopyFallback"));
    }
  };

  const handleImport = () => {
    const ok = importJson(importArea);
    if (ok) {
      setImportArea("");
      setShowImport(false);
      setStatus(tr("stImported"));
    } else {
      setStatus(tr("stImportFail"));
    }
  };

  const handleReset = () => {
    if (!window.confirm(tr("stResetConfirm"))) return;
    reset();
    setStatus(tr("stResetDone"));
  };

  const handleClearCache = () => {
    if (!window.confirm(tr("stClearCacheConfirm"))) return;
    reset();
    setStatus(tr("stCacheCleared"));
  };

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stReset")}</span>
        <p className="settingDesc">{tr("stResetDesc")}</p>
        <button className="settingsBtn danger" type="button" onClick={handleReset}>
          {tr("stResetBtn")}
        </button>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stExportImport")}</span>
        <div className="dataActions">
          <button className="settingsBtn" type="button" onClick={handleCopy}>{tr("stCopyJson")}</button>
          <button className="settingsBtn" type="button" onClick={handleExport}>{tr("stDownloadJson")}</button>
          <button className="settingsBtn" type="button" onClick={() => setShowImport((v) => !v)}>
            {showImport ? tr("stCancel") : tr("stImportJson")}
          </button>
        </div>
        {showImport && (
          <div className="importArea">
            <textarea
              className="settingsTextarea"
              placeholder={tr("stImportPlaceholder")}
              aria-label={tr("stImportPlaceholder")}
              value={importArea}
              onChange={(e) => setImportArea(e.target.value)}
              rows={6}
            />
            <button className="settingsBtn primary" type="button" onClick={handleImport}>
              {tr("stConfirmImport")}
            </button>
          </div>
        )}
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stCache")}</span>
        <p className="settingDesc">{tr("stCacheDesc")}</p>
        <button className="settingsBtn danger" type="button" onClick={handleClearCache}>
          {tr("stClearCache")}
        </button>
      </div>

      {status ? (
        <p className="settingsStatus" role="status" aria-live="polite">{status}</p>
      ) : null}
    </div>
  );
}
