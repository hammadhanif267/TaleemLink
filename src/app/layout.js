import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./phase-c.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "TaleemLink | Learning workspace",
  description: "A calm, organised learning space for lessons, assignments and student progress — designed to grow into an offline-friendly study app.",
  applicationName: "TaleemLink",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TaleemLink" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
