import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/navigation/Header";
import Footer from "@/components/navigation/Footer";
import CartNotificationProvider from "@/components/cart/CartNotificationProvider";
import PWARegister from "@/components/PWARegister";
import InstallPrompt from "@/components/InstallPrompt";
import PWAMetaTags from "@/components/PWAMetaTags";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";

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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
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
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="leez-theme" enableSystem={false}>
          <PWAMetaTags />
          <PWARegister />
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          <CartNotificationProvider />
          <InstallPrompt />
          <PWAUpdatePrompt />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
