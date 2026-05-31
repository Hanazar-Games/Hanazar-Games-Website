import "./globals.css";
import type { Metadata } from "next";
import { SettingsProvider } from "./components/SettingsContext";
import HtmlLang from "./components/HtmlLang";
import StyleApplier from "./components/StyleApplier";
import AudioEngine from "./components/AudioEngine";
import SettingsLauncher from "./components/SettingsLauncher";

export const metadata: Metadata = {
  title: "Hanazar Games",
  description: "Welcome to Hanazar Games."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <HtmlLang />
          <StyleApplier />
          <AudioEngine />
          <SettingsLauncher />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
