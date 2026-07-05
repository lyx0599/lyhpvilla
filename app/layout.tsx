import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "林屿湖畔",
  description: "用于林屿湖畔结构建模、施工标注和空间沟通的可视化效果展示模型"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
