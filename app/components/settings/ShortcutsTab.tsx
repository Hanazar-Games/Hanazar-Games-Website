"use client";

import { useTranslation } from "../../hooks/useTranslation";

const shortcuts = [
  { actionKey: "scOpenSettings", key: "Ctrl + ," },
  { actionKey: "scCloseModal", key: "Escape" },
  { actionKey: "scNavigateTabs", key: "Tab / Shift + Tab" },
  { actionKey: "scToggleTheme", key: "Ctrl + Shift + L" },
  { actionKey: "scMute", key: "Ctrl + M" },
  { actionKey: "scReset", key: "Ctrl + Shift + R" },
  { actionKey: "scExport", key: "Ctrl + Shift + E" },
  { actionKey: "scImport", key: "Ctrl + Shift + I" },
];

export default function ShortcutsTab() {
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stShortcuts")}</span>
        <p className="settingDesc">{tr("stShortcutsDesc")}</p>
        <div className="shortcutsTable">
          {shortcuts.map((s) => (
            <div className="shortcutRow" key={s.actionKey}>
              <span className="shortcutAction">{tr(s.actionKey)}</span>
              <kbd className="shortcutKey">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
