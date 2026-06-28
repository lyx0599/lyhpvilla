import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Villa Space Studio",
  description: "用于叠墅结构建模、施工标注和空间沟通的网站工作台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
