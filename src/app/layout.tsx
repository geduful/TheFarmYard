import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from '@/components/ui/Toast';
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
  metadataBase: new URL('https://thefarmyard.vercel.app'),
  title: "TheFarmYard - Agricultural Marketplace",
  description: "Connecting farmers directly to buyers across all agricultural sectors. Buy and sell crops, livestock, poultry, and aquaculture products in Ghana.",
  keywords: ["agriculture", "marketplace", "farmers", "buyers", "Ghana", "crops", "livestock", "poultry", "aquaculture", "farm produce"],
  authors: [{ name: "TheFarmYard" }],
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: "https://thefarmyard.vercel.app",
    siteName: "TheFarmYard",
    title: "TheFarmYard - Agricultural Marketplace",
    description: "Connecting farmers directly to buyers across all agricultural sectors. Buy and sell crops, livestock, poultry, and aquaculture products in Ghana.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TheFarmYard - Agricultural Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TheFarmYard - Agricultural Marketplace",
    description: "Connecting farmers directly to buyers across all agricultural sectors.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.webp', sizes: 'any', type: 'image/webp' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
