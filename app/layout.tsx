import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustPass Thailand",
  description: "AI scam and fraud risk check for tourists in Thailand"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
