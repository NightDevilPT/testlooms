import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/layout/root-layout";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TestLoom - Web Automation & Live Inspector",
  description: "Interactive Playwright test recorder, live browser inspector, and multi-framework exporter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
