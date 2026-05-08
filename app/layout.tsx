import "./globals.css";
import type { Metadata } from "next";
import { SettingsProvider } from "./components/SettingsContext";
import HtmlLang from "./components/HtmlLang";

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
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
