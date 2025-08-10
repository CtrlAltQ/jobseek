import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Job Finder | Automated Job Discovery Platform",
  description: "Personal AI-powered job search platform that automatically discovers and matches relevant job opportunities from multiple sources.",
  keywords: ["job search", "AI", "automation", "career", "employment"],
  authors: [{ name: "AI Job Finder" }],
  openGraph: {
    title: "AI Job Finder | Automated Job Discovery Platform",
    description: "Personal AI-powered job search platform that automatically discovers and matches relevant job opportunities from multiple sources.",
    url: process.env.NEXT_PUBLIC_API_URL || 'https://ai-job-finder.vercel.app',
    siteName: "AI Job Finder",
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'AI Job Finder - Automated Job Discovery Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "AI Job Finder | Automated Job Discovery Platform",
    description: "Personal AI-powered job search platform that automatically discovers and matches relevant job opportunities from multiple sources.",
    images: ['/og-image.svg'],
  },
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
