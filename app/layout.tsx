import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
