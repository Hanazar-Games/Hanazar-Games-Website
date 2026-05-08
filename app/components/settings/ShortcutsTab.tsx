"use client";

const shortcuts = [
  { action: "Open Settings", key: "Ctrl + ," },
  { action: "Close Modal", key: "Escape" },
  { action: "Navigate Tabs", key: "Tab / Shift + Tab" },
  { action: "Toggle Theme", key: "Ctrl + Shift + L" },
  { action: "Mute / Unmute", key: "Ctrl + M" },
  { action: "Reset Settings", key: "Ctrl + Shift + R" },
  { action: "Export Config", key: "Ctrl + Shift + E" },
  { action: "Import Config", key: "Ctrl + Shift + I" },
];

export default function ShortcutsTab() {
  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">Keyboard Shortcuts</span>
        <p className="settingDesc">These shortcuts are available across the site.</p>
        <div className="shortcutsTable">
          {shortcuts.map((s) => (
            <div className="shortcutRow" key={s.action}>
              <span className="shortcutAction">{s.action}</span>
              <kbd className="shortcutKey">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
