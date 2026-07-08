import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sorting Zoo",
  description: "一个纯前端排序算法演示工具台。",
  icons: {
    icon: "/brand-icon-white.png",
    apple: "/brand-icon-white.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
