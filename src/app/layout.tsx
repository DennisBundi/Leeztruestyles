import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/navigation/Header";
import Footer from "@/components/navigation/Footer";
import CartNotificationProvider from "@/components/cart/CartNotificationProvider";
import PWARegister from "@/components/PWARegister";
import InstallPrompt from "@/components/InstallPrompt";
import PWAMetaTags from "@/components/PWAMetaTags";
import ChunkLoadErrorBoundary from "@/components/ChunkLoadErrorBoundary";

export const metadata: Metadata = {
  title: "Leeztruestyles - Fashion Marketplace",
  description: "Premium fashion marketplace in Kenya",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Leeztruestyles",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#f9a8d4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <ChunkLoadErrorBoundary>
          <PWAMetaTags />
          <PWARegister />
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          <CartNotificationProvider />
          <InstallPrompt />
        </ChunkLoadErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
