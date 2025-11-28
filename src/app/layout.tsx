import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPS Monitor",
  description: "VPS monitoring dashboard for speed, resources and network quality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
