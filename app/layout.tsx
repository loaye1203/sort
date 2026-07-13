import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sort.loayes.com"),
  title: "Sorting Zoo｜排序算法演示工具台",
  description: "探索 148 种排序算法，查看实现层级、复杂度、概念伪代码，并通过交互动画理解排序过程。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Sorting Zoo",
    title: "Sorting Zoo｜排序算法演示工具台",
    description: "探索 148 种排序算法，查看实现层级、复杂度、概念伪代码，并通过交互动画理解排序过程。",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Sorting Zoo 站点图标" }],
  },
  twitter: {
    card: "summary",
    title: "Sorting Zoo｜排序算法演示工具台",
    description: "探索 148 种排序算法，查看实现层级、复杂度、概念伪代码，并通过交互动画理解排序过程。",
    images: ["/icon.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeInitializer = `try{var t=localStorage.getItem("sorting-zoo-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark"}`;
  const shellThemeInitializer = `var shell=document.querySelector("main");if(shell)shell.dataset.theme=document.documentElement.dataset.theme||"dark"`;
  return (
    <html lang="zh-CN">
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializer }} /></head>
      <body>{children}<script dangerouslySetInnerHTML={{ __html: shellThemeInitializer }} /></body>
    </html>
  );
}
