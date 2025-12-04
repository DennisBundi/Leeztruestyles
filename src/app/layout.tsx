import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/navigation/Header";
import Footer from "@/components/navigation/Footer";
import CartNotificationProvider from "@/components/cart/CartNotificationProvider";

export const metadata: Metadata = {
  title: "Leeztruestyles - Fashion Marketplace",
  description: "Premium fashion marketplace in Kenya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CartNotificationProvider />
      </body>
    </html>
  );
}
