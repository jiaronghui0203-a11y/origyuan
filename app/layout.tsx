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
  metadataBase: new URL("https://origyuan.com"),
  title: "原光初心 · 让人类回归本源，用 AI 创造未来",
  description: "上海原光初心科技有限公司官方网站。让人类回归本源，用 AI 创造未来。",
  openGraph: {
    title: "原光初心 · 让人类回归本源，用 AI 创造未来",
    description: "上海原光初心科技有限公司官方网站。",
    url: "https://origyuan.com",
    siteName: "Origyuan",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "https://origyuan.com/og.png",
        width: 1672,
        height: 941,
        alt: "Origyuan 原光初心 · 让人类回归本源，用 AI 创造未来",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "原光初心 · 让人类回归本源，用 AI 创造未来",
    description: "上海原光初心科技有限公司官方网站。",
    images: ["https://origyuan.com/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
