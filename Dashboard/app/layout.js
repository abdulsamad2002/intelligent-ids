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

export const metadata = {
  title: "Guardian IDS Dashboard",
  description: "Advanced Intrusion Detection System",
};

import DashboardLayout from "@/components/DashboardLayout";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}
